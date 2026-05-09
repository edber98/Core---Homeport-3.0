# Release Kinn → Rancher (Helm OCI)

Procédure complète pour livrer une nouvelle version Kinn en production via Rancher. Couvre le cycle complet : bump versions → CI builds images → publication chart Helm OCI → upgrade Rancher.

---

## Vue d'ensemble du flow

```
1. release.sh (repo Kinn)
   ├── bump Chart.yaml + deployment-back + deployment-front
   ├── commit + tag vX.Y.Z
   └── push branch production + tag

2. CI GitLab (job build_release, déclenché par tag vX.Y.Z)
   └── build & push images dans registry.c4rbon.group :
       ├── api:vX.Y.Z + api:latest
       └── web:vX.Y.Z + web:latest

3. Publication chart Helm OCI (manuel, repo rancher-templates-test)
   ├── sync kinn_manifest/ → rancher-templates-test/kinn/
   ├── helm package kinn
   └── helm push kinn-X.Y.Z.tgz oci://registry.c4rbon.group/.../rancher-templates-test

4. Upgrade Rancher
   └── Apps & Marketplace → Installed Apps → Kinn → Upgrade
```

---

## Pré-requis (à faire une seule fois)

### Login au registry GitLab via Helm

```bash
helm registry login registry.c4rbon.group
# Username: edouard.bernier
# Password: <ton PAT GitLab avec scope read_registry + write_registry>
# → "Login Succeeded"
```

Le PAT GitLab se génère dans **GitLab → User Settings → Access Tokens** avec scopes `read_registry` + `write_registry`. À garder dans 1Password.

### Cloner le repo rancher-templates-test

C'est le repo qui héberge **TOUS** les charts Helm de ton infra (Kinn, Penpot, mongodb, etc.). Le chart Kinn y est synchronisé depuis le main repo.

```bash
cd ~/Documents/Projets/i55/Projet/Core\ 2.0/Rancher/
git clone <gitlab-url>/rancher-templates-test
cd rancher-templates-test
ls
# app-test  builds  index.yaml  joly-formation  kinn  mongodb  penpot  qms-api  todo  whoami
```

---

## Étape 1 — Release dans le repo Kinn

```bash
cd ~/Documents/Projets/i55/Projet/Core\ 2.0/Application/Homeport\ 1.0/
./scripts/release.sh
```

Le script va :
- Détecter la version actuelle (lue dans `kinn_manifest/templates/deployment-back.yaml`)
- Te demander patch / minor / major
- Bump `Chart.yaml` (version + appVersion) + `deployment-back.yaml` + `deployment-front.yaml`
- Commit + tag + push branch production + push tag sur GitLab

**Attendre la fin du pipeline `build_release`** sur GitLab (lien affiché par le script). Vérifie que les images sont bien dans le registry :
- `registry.c4rbon.group/edouard.bernier/kinn-homeport/api:vX.Y.Z`
- `registry.c4rbon.group/edouard.bernier/kinn-homeport/web:vX.Y.Z`

---

## Étape 2 — Sync du chart vers rancher-templates-test

Le chart maître vit dans `kinn_manifest/` du repo Kinn. Il faut le copier dans `rancher-templates-test/kinn/`.

```bash
# Depuis le repo Kinn
cd ~/Documents/Projets/i55/Projet/Core\ 2.0/Application/Homeport\ 1.0/

# Copie le chart vers rancher-templates-test
rsync -a --delete kinn_manifest/ \
  ~/Documents/Projets/i55/Projet/Core\ 2.0/Rancher/rancher-templates-test/kinn/

# Va dans le repo rancher templates
cd ~/Documents/Projets/i55/Projet/Core\ 2.0/Rancher/rancher-templates-test/

# Vérifie que la nouvelle version est bien dans Chart.yaml
cat kinn/Chart.yaml | head -5
# → version: X.Y.Z (doit matcher ce que release.sh a bumpé)
```

Si tu veux ajuster manuellement (rare) :
```bash
vi kinn/Chart.yaml
# édite version: X.Y.Z + appVersion: vX.Y.Z
```

---

## Étape 3 — Package + push OCI

```bash
# Toujours dans rancher-templates-test/
helm package kinn
# → Successfully packaged chart and saved it to:
#   /Users/edouardbernier/.../rancher-templates-test/kinn-X.Y.Z.tgz

helm push kinn-X.Y.Z.tgz oci://registry.c4rbon.group/aurelien.mosini/rancher-templates-test
# → Pushed: registry.c4rbon.group/aurelien.mosini/rancher-templates-test/kinn:X.Y.Z
# → Digest: sha256:...

# Cleanup du .tgz local (le chart est maintenant dans le registry OCI)
rm kinn-X.Y.Z.tgz
```

**Note importante** : remplace `X.Y.Z` par la version réelle (ex: `1.0.19`). Le filename `.tgz` est déterminé par le `version:` dans `Chart.yaml`, **pas par l'appVersion**.

⚠️ **Piège fréquent** : `helm push` doit avoir 2 arguments (le `.tgz` + l'URL OCI), séparés par un espace. **Pas** de `&&`/`;` recollé. Si tu vois `Error: "helm push" requires at least 2 arguments`, c'est que ta commande est mal coupée.

---

## Étape 4 — Commit + push du repo rancher-templates-test

```bash
git add kinn/
git commit -m "chore: bump kinn to X.Y.Z"
git push
```

Ça garde un historique git du chart en parallèle de l'OCI. Le `index.yaml` peut aussi être à régénérer si tu utilises encore un repo HTTP en plus de l'OCI :
```bash
helm repo index . --url https://... # adapte l'URL
git add index.yaml
git commit --amend --no-edit
git push --force-with-lease
```

(Pour OCI seul, le `index.yaml` n'est pas nécessaire.)

---

## Étape 5 — Upgrade dans Rancher

1. Ouvre Rancher → cluster cible → **Apps & Marketplace** → **Installed Apps**
2. Cherche l'app **Kinn** (du namespace correspondant à ton client)
3. Clique sur le menu kebab `⋮` → **Edit/Upgrade**
4. Rancher détecte la nouvelle version chart `X.Y.Z` dans le registry OCI
5. Clique **Upgrade**
6. Rancher pull les nouvelles images `api:vX.Y.Z` + `web:vX.Y.Z` et redéploie les pods

**Vérification** :
```bash
kubectl get pods -n <namespace-client>
# Tous les pods doivent passer en Running avec le nouveau hash
kubectl logs -n <namespace-client> deploy/<release-name>-kinn-api --tail=50
```

---

## Cas particuliers

### Force re-pull d'image (si Rancher cache)

Si tu as bumpé `:latest` sans changer le tag spécifique, Rancher peut garder l'ancien. Solutions :
- **Préventif** : utilise toujours le tag spécifique `vX.Y.Z`, jamais `:latest`, dans `deployment-back.yaml` (déjà le cas avec release.sh)
- **Forcer** : `kubectl rollout restart deploy/<release-name>-kinn-api -n <ns>`

### Rollback

Rancher → Installed Apps → Kinn → menu `⋮` → **History & Rollback** → choisis la révision précédente.

Ou en CLI :
```bash
helm history <release-name> -n <namespace>
helm rollback <release-name> <revision> -n <namespace>
```

### Le chart OCI n'apparaît pas dans Rancher

Vérifie que Rancher a bien le repo OCI configuré :
- Apps & Marketplace → Repositories → ton repo doit pointer sur `oci://registry.c4rbon.group/aurelien.mosini/rancher-templates-test`
- Si nécessaire, **Refresh** le repo
- Rancher peut mettre 1-2 min à voir une nouvelle version

### Versionning chart vs appVersion

| Champ | Sémantique | Quand bumper |
|---|---|---|
| `Chart.yaml > version` (ex: `1.0.19`) | Version du package Helm | À chaque modif du chart (templates, values, etc.) |
| `Chart.yaml > appVersion` (ex: `vX.Y.Z`) | Version de l'app déployée | À chaque release applicative |
| Image tag (`/api:vX.Y.Z` dans deployment-back.yaml) | Doit matcher `appVersion` | Idem |

Le `release.sh` du repo Kinn gère les 3 automatiquement. Le `version` du chart est en patch++ à chaque release par défaut.

---

## Récap commandes (cheat-sheet)

```bash
# 1. Repo Kinn — release
cd ~/.../Application/Homeport\ 1.0/
./scripts/release.sh
# → patch / minor / major → Y → attends la CI

# 2. Sync chart
rsync -a --delete kinn_manifest/ ~/.../Rancher/rancher-templates-test/kinn/

# 3. Package + push OCI
cd ~/.../Rancher/rancher-templates-test/
helm package kinn
helm push kinn-X.Y.Z.tgz oci://registry.c4rbon.group/aurelien.mosini/rancher-templates-test
rm kinn-X.Y.Z.tgz

# 4. Commit
git add kinn/ && git commit -m "chore: bump kinn to X.Y.Z" && git push

# 5. Rancher → Apps → Kinn → Upgrade
```

---

## Automatisation future (TODO)

Pour éviter les étapes 2-3 manuelles, on peut ajouter un job `chart_release` au `.gitlab-ci.yml` du repo Kinn qui :
1. Au push de tag `v*`, package le chart
2. Push vers l'OCI registry
3. Update le repo rancher-templates-test via API

Ébauche :
```yaml
chart_release:
  stage: deploy
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v[0-9]+\.[0-9]+\.[0-9]+$/'
  before_script:
    - apk add --no-cache helm  # ou autre selon l'image runner
    - echo "$CI_REGISTRY_PASSWORD" | helm registry login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
  script:
    - cd kinn_manifest && helm package . -d /tmp/
    - helm push /tmp/kinn-*.tgz oci://$CI_REGISTRY/aurelien.mosini/rancher-templates-test
```

À implémenter quand tu auras le temps. Le manuel actuel est fonctionnel pour 1-2 releases / mois.
