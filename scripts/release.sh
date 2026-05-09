#!/usr/bin/env bash
# release.sh — orchestration locale d'une release Kinn.
#
# Workflow :
#   1. Vérifie le working tree est clean
#   2. Mémorise la branche actuelle (retour à la fin si tout OK)
#   3. Identifie la remote pointant sur gitlab.c4rbon.group (parmi N origins)
#   4. Récupère le dernier tag distant (ex: v0.0.33)
#   5. Demande patch / minor / major → calcule la nouvelle version
#   6. checkout production + pull + merge de la branche initiale
#   7. Bump des fichiers (Chart.yaml version + appVersion, deployment-back, deployment-front)
#   8. Commit + tag
#   9. Push UN SEUL coup (branche production + tag) sur la remote gitlab
#  10. Retour à la branche initiale
#
# Le push déclenche en parallèle :
#   - Pipeline production : démo Docker Compose (existant)
#   - Pipeline tag        : build + push registry GitLab (nouveau, voir .gitlab-ci.yml)
#
# Rancher : non automatisé (Niveau 0). Va dans Apps → Kinn → Upgrade quand prêt.

set -euo pipefail

# ─── Couleurs pour la lisibilité ─────────────────────────────────────────
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
BOLD=$'\033[1m'
NC=$'\033[0m'

step()  { echo "${BLUE}${BOLD}▶ $*${NC}"; }
ok()    { echo "${GREEN}✓ $*${NC}"; }
warn()  { echo "${YELLOW}⚠ $*${NC}"; }
err()   { echo "${RED}✗ $*${NC}" >&2; }
fatal() { err "$*"; exit 1; }

# ─── Restauration en cas d'erreur ────────────────────────────────────────
ORIGINAL_BRANCH=""
restore_branch() {
  if [[ -n "$ORIGINAL_BRANCH" ]] && [[ "$(git rev-parse --abbrev-ref HEAD)" != "$ORIGINAL_BRANCH" ]]; then
    warn "Erreur détectée — je reste sur la branche courante pour que tu puisses corriger"
    warn "Pour revenir manuellement : git checkout $ORIGINAL_BRANCH"
  fi
}
trap 'restore_branch' ERR

# ─── 0. Pré-requis ───────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

step "Vérification de l'environnement"
command -v git >/dev/null || fatal "git n'est pas installé"
[[ -d .git ]] || fatal "ce script doit être lancé depuis la racine du repo"

# Fichiers à bumper
CHART_FILE="kinn_manifest/Chart.yaml"
DEPLOY_BACK="kinn_manifest/templates/deployment-back.yaml"
DEPLOY_FRONT="kinn_manifest/templates/deployment-front.yaml"

for f in "$CHART_FILE" "$DEPLOY_BACK" "$DEPLOY_FRONT"; do
  [[ -f "$f" ]] || fatal "fichier introuvable : $f"
done
ok "Repo $ROOT_DIR — fichiers chart présents"

# ─── 1. Working tree clean ───────────────────────────────────────────────
step "Vérification working tree clean"
if [[ -n "$(git status --porcelain)" ]]; then
  err "Tu as des modifications non commitées :"
  git status --short
  fatal "Commit ou stash tes changements avant de release"
fi
ok "Working tree propre"

# ─── 2. Mémorise la branche actuelle ─────────────────────────────────────
ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$ORIGINAL_BRANCH" == "HEAD" ]] && fatal "tu es en detached HEAD, checkout une branche d'abord"
ok "Branche initiale : $ORIGINAL_BRANCH"

# ─── 3. Identifier les remotes valides du repo kinn-homeport ─────────────
# Critère : URL contient "kinn-homeport" (GitLab) ou "Core---Homeport" (GitHub).
# On exclut les remotes pointant sur d'AUTRES repos même s'ils sont sur le
# même hôte gitlab.c4rbon.group (ex: backend-origin → kinn-api.git).
step "Recherche des remotes du repo kinn-homeport"
VALID_REMOTES=()
GITLAB_REMOTE=""
SKIPPED_REMOTES=()
while IFS= read -r line; do
  name=$(echo "$line" | awk '{print $1}')
  url=$(echo "$line" | awk '{print $2}')
  if echo "$url" | grep -qE "(kinn-homeport|Core---Homeport)"; then
    VALID_REMOTES+=("$name")
    if echo "$url" | grep -q "gitlab.c4rbon.group"; then
      GITLAB_REMOTE="$name"
    fi
  else
    SKIPPED_REMOTES+=("$name")
  fi
done < <(git remote -v | grep "(push)")

[[ -z "$GITLAB_REMOTE" ]] && fatal "Aucune remote GitLab pointant sur kinn-homeport trouvée. Remotes : $(git remote -v)"
[[ ${#VALID_REMOTES[@]} -eq 0 ]] && fatal "Aucune remote valide pour ce repo"

ok "Remote GitLab (CI) : ${BOLD}$GITLAB_REMOTE${NC}"
ok "Remotes pour push branche : ${BOLD}${VALID_REMOTES[*]}${NC}"
if [[ ${#SKIPPED_REMOTES[@]} -gt 0 ]]; then
  warn "Remotes ignorées (autre repo) : ${SKIPPED_REMOTES[*]}"
fi

# ─── 4. Fetch + lecture de la version actuelle ───────────────────────────
# Source de vérité prioritaire : tag d'image dans deployment-back.yaml.
# Si l'image est `:latest` (ou autre non-semver), fallback sur le dernier git
# tag distant. En dernier recours, v0.0.0 (premier release).
git fetch "$GITLAB_REMOTE" --tags --prune --prune-tags >/dev/null 2>&1 || true
LAST_GIT_TAG="$(git tag -l 'v*' --sort=-v:refname | head -1 || true)"

step "Lecture de la version actuelle"
LAST_TAG="$(grep -E 'image: .+/api:v[0-9]+\.[0-9]+\.[0-9]+' "$DEPLOY_BACK" \
  | sed -E 's|.*/api:(v[0-9]+\.[0-9]+\.[0-9]+).*|\1|' | head -1 || true)"

if [[ -n "$LAST_TAG" ]]; then
  ok "Image API actuelle : ${BOLD}$LAST_TAG${NC} (lue dans $DEPLOY_BACK)"
elif [[ -n "$LAST_GIT_TAG" ]]; then
  LAST_TAG="$LAST_GIT_TAG"
  warn "$DEPLOY_BACK pointe sur :latest (ou autre non-semver) — fallback dernier git tag : ${BOLD}$LAST_TAG${NC}"
else
  LAST_TAG="v0.0.0"
  warn "Ni tag yaml ni git tag — fallback ${BOLD}$LAST_TAG${NC} (premier release ?)"
fi

# Sanity check : la version dans deployment-front doit matcher (si yaml taggé)
FRONT_TAG="$(grep -E 'image: .+/web:v[0-9]+\.[0-9]+\.[0-9]+' "$DEPLOY_FRONT" \
  | sed -E 's|.*/web:(v[0-9]+\.[0-9]+\.[0-9]+).*|\1|' | head -1 || true)"
if [[ -n "$FRONT_TAG" ]] && [[ "$FRONT_TAG" != "$LAST_TAG" ]]; then
  warn "Versions désynchronisées : api=$LAST_TAG, web=$FRONT_TAG (le bump alignera)"
fi

# ─── 5. Calcul de la nouvelle version ────────────────────────────────────
# Override possible via env :
#   KINN_RELEASE_VERSION=v0.5.0  → définit NEW_TAG (image tag + Chart.appVersion)
#   KINN_CHART_VERSION=1.2.0     → définit CHART_PATCH_NEXT (Chart.yaml version)
# Sinon prompt interactif patch/minor/major + auto-patch++ pour le chart.

if [[ -n "${KINN_RELEASE_VERSION:-}" ]]; then
  if [[ ! "$KINN_RELEASE_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    fatal "KINN_RELEASE_VERSION='$KINN_RELEASE_VERSION' invalide — attendu vX.Y.Z (ex: v0.5.0)"
  fi
  NEW_TAG="$KINN_RELEASE_VERSION"
  ok "Version forcée via env KINN_RELEASE_VERSION : ${BOLD}$NEW_TAG${NC}"
else
  # Parse v MAJOR.MINOR.PATCH
  if [[ ! "$LAST_TAG" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    fatal "Tag '$LAST_TAG' ne suit pas le format vX.Y.Z — résous manuellement avant de release"
  fi
  MAJOR="${BASH_REMATCH[1]}"
  MINOR="${BASH_REMATCH[2]}"
  PATCH="${BASH_REMATCH[3]}"

  PATCH_NEXT="v${MAJOR}.${MINOR}.$((PATCH + 1))"
  MINOR_NEXT="v${MAJOR}.$((MINOR + 1)).0"
  MAJOR_NEXT="v$((MAJOR + 1)).0.0"

  echo
  echo "Choisis le type d'incrément (ou définis KINN_RELEASE_VERSION en env pour skipper) :"
  echo "  ${BOLD}[1]${NC} patch  → $PATCH_NEXT   (bug fix, modif mineure)"
  echo "  ${BOLD}[2]${NC} minor  → $MINOR_NEXT     (nouvelle feature, compat préservée)"
  echo "  ${BOLD}[3]${NC} major  → $MAJOR_NEXT       (breaking change)"
  echo "  ${BOLD}[q]${NC} annuler"
  read -rp "> " choice

  case "$choice" in
    1) NEW_TAG="$PATCH_NEXT" ;;
    2) NEW_TAG="$MINOR_NEXT" ;;
    3) NEW_TAG="$MAJOR_NEXT" ;;
    q|Q) echo "Annulé."; exit 0 ;;
    *) fatal "Choix invalide" ;;
  esac
  ok "Nouvelle version : ${BOLD}$NEW_TAG${NC}"
fi

# ─── 5bis. Bump Chart.yaml.version ───────────────────────────────────────
# Par défaut : patch++ automatique. Override via KINN_CHART_VERSION en env.
CURRENT_CHART_VERSION="$(grep -E '^version:' "$CHART_FILE" | awk '{print $2}' | tr -d '"')"
if [[ ! "$CURRENT_CHART_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  fatal "Chart.yaml version '$CURRENT_CHART_VERSION' invalide — attendu X.Y.Z"
fi

if [[ -n "${KINN_CHART_VERSION:-}" ]]; then
  if [[ ! "$KINN_CHART_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    fatal "KINN_CHART_VERSION='$KINN_CHART_VERSION' invalide — attendu X.Y.Z (sans 'v', ex: 1.2.0)"
  fi
  CHART_PATCH_NEXT="$KINN_CHART_VERSION"
  ok "Chart version forcée via env KINN_CHART_VERSION : ${BOLD}$CHART_PATCH_NEXT${NC}"
else
  CHART_PATCH_NEXT="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$((BASH_REMATCH[3] + 1))"
  ok "Chart.yaml version : $CURRENT_CHART_VERSION → ${BOLD}$CHART_PATCH_NEXT${NC} (auto patch++)"
fi

# ─── 6. Confirmation finale ──────────────────────────────────────────────
echo
echo "${BOLD}Récapitulatif :${NC}"
echo "  • Branche actuelle     : $ORIGINAL_BRANCH"
echo "  • Dernier tag distant  : $LAST_TAG"
echo "  • Nouveau tag          : $NEW_TAG"
echo "  • Chart.yaml version   : $CURRENT_CHART_VERSION → $CHART_PATCH_NEXT"
echo "  • Chart.yaml appVersion: → $NEW_TAG"
echo "  • Image API            : api:$LAST_TAG → api:$NEW_TAG"
echo "  • Image WEB            : web:$LAST_TAG → web:$NEW_TAG"
echo "  • Remote GitLab (CI)   : $GITLAB_REMOTE"
echo "  • Push branche         : production → ${VALID_REMOTES[*]}"
echo "  • Push tag             : $NEW_TAG → $GITLAB_REMOTE uniquement (CI/CD)"
echo
read -rp "Procéder ? (y/N) " confirm
[[ "$confirm" =~ ^[yY]$ ]] || { echo "Annulé."; exit 0; }

# ─── 7. Checkout production + pull + merge ───────────────────────────────
step "Checkout production"
git checkout production
git pull --ff-only "$GITLAB_REMOTE" production || fatal "production locale n'est pas fast-forward avec $GITLAB_REMOTE/production — résous d'abord"
ok "production à jour"

if [[ "$ORIGINAL_BRANCH" != "production" ]]; then
  step "Merge $ORIGINAL_BRANCH → production"
  git merge --no-ff -m "merge: $ORIGINAL_BRANCH into production for $NEW_TAG" "$ORIGINAL_BRANCH" \
    || fatal "Conflit de merge — résous manuellement et relance"
  ok "Merge OK"
fi

# ─── 8. Bump des fichiers ────────────────────────────────────────────────
step "Bump des fichiers chart"

# Chart.yaml — version + appVersion
# sed -i diffère sur macOS (BSD) vs Linux (GNU). On utilise un sed portable.
sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

sed_inplace -E "s/^version: .*/version: $CHART_PATCH_NEXT/" "$CHART_FILE"
sed_inplace -E "s/^appVersion: .*/appVersion: $NEW_TAG/" "$CHART_FILE"
ok "Chart.yaml : version=$CHART_PATCH_NEXT, appVersion=$NEW_TAG"

# deployment-back.yaml — image api:<tag>  (matche :vX.Y.Z, :latest, etc.)
sed_inplace -E "s|(/api):[^[:space:]\"']+|\1:$NEW_TAG|g" "$DEPLOY_BACK"
ok "$DEPLOY_BACK : api:$NEW_TAG"

# deployment-front.yaml — image web:<tag>
sed_inplace -E "s|(/web):[^[:space:]\"']+|\1:$NEW_TAG|g" "$DEPLOY_FRONT"
ok "$DEPLOY_FRONT : web:$NEW_TAG"

# Sanity check — les fichiers ont bien changé
if git diff --quiet "$CHART_FILE" "$DEPLOY_BACK" "$DEPLOY_FRONT"; then
  fatal "Aucune modification détectée dans les fichiers — pattern sed incorrect ?"
fi

echo
echo "${BOLD}Diff appliqué :${NC}"
git --no-pager diff --stat "$CHART_FILE" "$DEPLOY_BACK" "$DEPLOY_FRONT"

# ─── 9. Commit + tag ─────────────────────────────────────────────────────
step "Commit du bump"
git add "$CHART_FILE" "$DEPLOY_BACK" "$DEPLOY_FRONT"
git commit -m "release: $NEW_TAG (chart $CHART_PATCH_NEXT)"
ok "Commit créé"

step "Création du tag $NEW_TAG"
git tag -a "$NEW_TAG" -m "Release $NEW_TAG"
ok "Tag créé"

# ─── 10. Push de la branche sur les remotes du repo kinn-homeport ────────
# Branche production = backup sur GitLab (CI) + GitHub (mirror).
# Les autres remotes (kinn-api etc.) ne reçoivent rien.
# Tag = uniquement sur GitLab (c'est là que tourne la CI/CD release).
step "Push branche production"
PUSH_FAILURES=()
for remote in "${VALID_REMOTES[@]}"; do
  echo "  → $remote"
  if git push "$remote" production; then
    ok "  $remote : production OK"
  else
    warn "  $remote : push échoué (continue avec les autres)"
    PUSH_FAILURES+=("$remote")
  fi
done

# Si la GitLab a échoué, c'est bloquant (la CI ne sera jamais déclenchée)
for f in "${PUSH_FAILURES[@]:-}"; do
  if [[ "$f" == "$GITLAB_REMOTE" ]]; then
    fatal "Le push sur $GITLAB_REMOTE (GitLab) a échoué — résous avant de retenter"
  fi
done

# ─── 11. Push du tag UNIQUEMENT sur GitLab ───────────────────────────────
step "Push tag $NEW_TAG vers $GITLAB_REMOTE (CI uniquement)"
git push "$GITLAB_REMOTE" "$NEW_TAG"
ok "Tag pushé sur $GITLAB_REMOTE — pipeline build_release démarré"

if [[ ${#PUSH_FAILURES[@]} -gt 0 ]]; then
  warn "Push branche échoué sur : ${PUSH_FAILURES[*]} (à retenter manuellement)"
fi

# ─── 12. Retour à la branche initiale ────────────────────────────────────
if [[ "$ORIGINAL_BRANCH" != "production" ]]; then
  step "Retour à $ORIGINAL_BRANCH"
  git checkout "$ORIGINAL_BRANCH"
  ok "Retour sur $ORIGINAL_BRANCH"
fi

# ─── 13. Affiche les liens utiles ────────────────────────────────────────
GITLAB_URL="$(git remote get-url "$GITLAB_REMOTE" | sed -E 's|^git@([^:]+):(.+)\.git$|https://\1/\2|; s|\.git$||')"

echo
echo "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo "${GREEN}${BOLD}  ✓ Release $NEW_TAG publiée${NC}"
echo "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo
echo "Pipelines à surveiller :"
echo "  • $GITLAB_URL/-/pipelines?ref=production"
echo "  • $GITLAB_URL/-/pipelines?ref=$NEW_TAG"
echo
echo "Une fois le pipeline tag terminé (✓ vert), va dans Rancher :"
echo "  Apps & Marketplace → Installed Apps → Kinn → Upgrade"
echo "  → Rancher détectera la nouvelle version chart $CHART_PATCH_NEXT"
echo "  → Rancher pull les images registry.c4rbon.group/.../api:$NEW_TAG et /web:$NEW_TAG"
echo
