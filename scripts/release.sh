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

# ─── 3. Identifier la remote GitLab ──────────────────────────────────────
step "Recherche de la remote GitLab"
GITLAB_REMOTE=""
while IFS= read -r line; do
  name=$(echo "$line" | awk '{print $1}')
  url=$(echo "$line" | awk '{print $2}')
  if echo "$url" | grep -q "gitlab.c4rbon.group"; then
    GITLAB_REMOTE="$name"
    break
  fi
done < <(git remote -v | grep "(push)")

[[ -z "$GITLAB_REMOTE" ]] && fatal "Aucune remote pointant sur gitlab.c4rbon.group trouvée. Liste : $(git remote -v)"
ok "Remote GitLab identifiée : $GITLAB_REMOTE"

# ─── 4. Fetch + lecture de la version actuelle ───────────────────────────
# Source de vérité = le tag d'image dans deployment-back.yaml. C'est ce que
# Rancher utilise réellement pour pull l'image. Git tags = simple repère
# créé en parallèle, non utilisé pour déterminer la version courante.
step "Lecture de la version actuelle depuis $DEPLOY_BACK"
LAST_TAG="$(grep -E 'image: .+/api:v[0-9]+\.[0-9]+\.[0-9]+' "$DEPLOY_BACK" \
  | sed -E 's|.*/api:(v[0-9]+\.[0-9]+\.[0-9]+).*|\1|' | head -1)"
if [[ -z "$LAST_TAG" ]]; then
  warn "Aucune image taguée trouvée dans $DEPLOY_BACK — fallback v0.0.0"
  LAST_TAG="v0.0.0"
fi
ok "Image API actuelle : ${BOLD}$LAST_TAG${NC} (lue dans $DEPLOY_BACK)"

# Sanity check : la version dans deployment-front doit matcher
FRONT_TAG="$(grep -E 'image: .+/web:v[0-9]+\.[0-9]+\.[0-9]+' "$DEPLOY_FRONT" \
  | sed -E 's|.*/web:(v[0-9]+\.[0-9]+\.[0-9]+).*|\1|' | head -1)"
if [[ "$FRONT_TAG" != "$LAST_TAG" ]]; then
  warn "Versions désynchronisées : api=$LAST_TAG, web=$FRONT_TAG"
  warn "Le bump aligne les deux sur la nouvelle version"
fi

# Pour info : dernier Git tag distant (juste affiché, non utilisé pour calcul)
git fetch "$GITLAB_REMOTE" --tags --prune --prune-tags >/dev/null 2>&1 || true
LAST_GIT_TAG="$(git tag -l 'v*' --sort=-v:refname | head -1)"
if [[ -n "$LAST_GIT_TAG" ]] && [[ "$LAST_GIT_TAG" != "$LAST_TAG" ]]; then
  warn "Dernier Git tag ($LAST_GIT_TAG) ≠ version YAML ($LAST_TAG) — c'est OK, le YAML fait foi"
fi

# ─── 5. Calcul de la nouvelle version ────────────────────────────────────
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
echo "Choisis le type d'incrément :"
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

# ─── 5bis. Calcul du bump Chart.yaml.version (toujours patch) ────────────
CURRENT_CHART_VERSION="$(grep -E '^version:' "$CHART_FILE" | awk '{print $2}' | tr -d '"')"
if [[ ! "$CURRENT_CHART_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  fatal "Chart.yaml version '$CURRENT_CHART_VERSION' invalide — attendu X.Y.Z"
fi
CHART_PATCH_NEXT="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$((BASH_REMATCH[3] + 1))"
ok "Chart.yaml version : $CURRENT_CHART_VERSION → ${BOLD}$CHART_PATCH_NEXT${NC}"

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
echo "  • Remote GitLab        : $GITLAB_REMOTE"
echo "  • Branche cible push   : production (+ tag $NEW_TAG)"
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

# deployment-back.yaml — image api:vX.Y.Z
sed_inplace -E "s|(/api):v[0-9]+\.[0-9]+\.[0-9]+|\1:$NEW_TAG|g" "$DEPLOY_BACK"
ok "$DEPLOY_BACK : api:$NEW_TAG"

# deployment-front.yaml — image web:vX.Y.Z
sed_inplace -E "s|(/web):v[0-9]+\.[0-9]+\.[0-9]+|\1:$NEW_TAG|g" "$DEPLOY_FRONT"
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

# ─── 10. Push UN SEUL coup (branche + tag) ───────────────────────────────
step "Push branche production + tag $NEW_TAG vers $GITLAB_REMOTE"
git push "$GITLAB_REMOTE" production "$NEW_TAG"
ok "Push OK — 2 pipelines vont démarrer en parallèle"

# ─── 11. Retour à la branche initiale ────────────────────────────────────
if [[ "$ORIGINAL_BRANCH" != "production" ]]; then
  step "Retour à $ORIGINAL_BRANCH"
  git checkout "$ORIGINAL_BRANCH"
  ok "Retour sur $ORIGINAL_BRANCH"
fi

# ─── 12. Affiche les liens utiles ────────────────────────────────────────
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
