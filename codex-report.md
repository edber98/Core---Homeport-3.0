Rapport de build et mise à jour des documents

1) Résumé du style appliqué
- Ciblé et conservateur: seules les références de chemin de fichiers ont été mises à jour, sans toucher au sens des documents.
- Remplacement systématique dans la documentation de `backend/src/` par `API/src/`, pour refléter la nouvelle arborescence (dissociation Homeport/API).
- Aucune modification des sections de documentation internes comme `docs/backend/*` (elles décrivent un domaine fonctionnel, pas un chemin physique).
- Respect de la rédaction originale (FR) et des mentions conceptuelles du « backend » non liées aux chemins.
- Build Angular exécuté via la configuration existante, sans changement de code.

2) Changements effectués
- Documentation: mise à jour des chemins de code `backend/src/...` -> `API/src/...` dans les fichiers listés ci‑dessous.
- Documentation API: mise à jour des exemples de chemins dans `docs/api/swagger-backend.yaml` (`./backend/src/...` -> `./API/src/...`).
- Frontend: exécution d’un build de production `ng build --configuration production` — succès, aucun correctif nécessaire.

3) Fichiers modifiés
- `docs/flow-execution-debug.md`
- `docs/AI_WORKFLOW.md`
- `docs/AI_FORM_AGENT_STATUS.md`
- `docs/AI_FORM_AGENT.md`
- `docs/technical/plugins-manifest.md`
- `docs/technical/frontend-integration.md`
- `docs/api/swagger-backend.yaml`

4) Message Conventional Commits simulé
docs(api): update docs paths to API/src after repo split

Co-authored-by: Codex CLI Agent <agent@openai>

Notes
- Sortie du build: `Homeport/dist/homeport` (Angular 20, hashing activé, budgets prod).
- Dépendances intactes; aucun avertissement bloquant ni erreur de compilation.
