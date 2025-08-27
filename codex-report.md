# Codex Build Report
Build production: statut et correctifs

1) Résumé du style appliqué
- Langage: TypeScript (Angular 20) avec composants standalone.
- Conventions: fichiers en kebab-case, classes en PascalCase, inputs/outputs en tête, cycle de vie ensuite.
- UI: NG Zorro; grilles `nz-row`/`nz-col`, `trackBy` pour limiter le churn DOM.
- Modules: fonctionnalités lazy sous `src/app/features/*`, modules réutilisables sous `src/app/modules/*` (ex.: `dynamic-form`).
- Assets: `public/` copié vers `dist` au build; budgets et allowlist CommonJS réglés dans `angular.json`.

2) Changements effectués (build production)
- Aucun changement requis. La commande `ng build --configuration production` a réussi du premier coup.
- Sortie: artefacts générés sous `dist/homeport`.

3) Fichiers modifiés
- Aucun fichier modifié dans cette passe.

4) Commit simulé (Conventional Commits)
- build: passer le build Angular en production sans modifications de code

---

Exécution temps réel: backend + frontend

1) Résumé du style appliqué
- Transport: SSE (Server-Sent Events) natif, compatible CORS simple.
- Auth SSE: jeton JWT accepté via query `?token=` (fallback pour EventSource).
- Statuts d’exécution alignés: `running` → `success`/`error` (au lieu de `completed`/`failed`).
- Diffusion optionnelle: `ws` et `socket.io` émettent les mêmes événements (si attachés).

2) Changements effectués
- backend/auth: accepte le token via `?token`/`?access_token` en plus de l’en-tête Authorization.
- backend/runs (mémoire):
  - Corrigé SSE pour émettre les nouveaux événements au fil de l’eau (plus de simple heartbeat).
  - Aligné les statuts finaux sur `success`/`error` et émission des événements terminaux `run.success`/`run.error`.
  - Diffusion des événements via ws/socket.io quand présents.
  - Ajout des routes: `POST /api/runs/:runId/cancel`, `GET /api/workspaces/:wsId/runs`, `GET /api/flows/:flowId/runs`.
- backend/runs (Mongo): corrigé la condition de fin SSE pour `success`/`error`.
- frontend/service: `RunsBackendService.stream(runId)` ouvre un EventSource `${apiBaseUrl}/api/runs/:id/stream?token=...` et parse les événements.
- frontend/ui: `FlowExecutionComponent` ouvre le stream après démarrage backend et affiche les événements en temps réel.

3) Fichiers modifiés
- backend/src/auth/jwt.js
- backend/src/modules/runs.js
- backend/src/modules/db/runs.js
  - Logs détaillés ajoutés (start/created/event/complete/stream open/close)
- src/app/services/runs-backend.service.ts
- src/app/features/flow/flow-execution.component.ts

4) Commit simulé (Conventional Commits)
- feat(flow): brancher l’exécution backend en temps réel (SSE) et afficher les événements côté UI

---

Logs et debug « flow_disabled »

- Ajout de logs verbeux dans:
  - `backend/src/modules/runs.js` (mémoire)
  - `backend/src/modules/db/runs.js` (Mongo)
  - Détails dans `docs/flow-execution-debug.md` (chemin complet, endpoints, logs attendus, erreurs fréquentes, check-list).
- Réponses `flow_disabled` enrichies avec `details: { flowId, workspaceId, enabled }`.
Date: 2025-08-24

1) Résumé du style appliqué
- Architecture: Angular 20 (TypeScript), approche routing-first avec features lazy sous `src/app/features/*`; modules réutilisables sous `src/app/modules/*` (ex: `dynamic-form`).
- Structure: entrée `src/main.ts`, racine `src/app/app.ts`, routes dans `src/app/app.routes.ts`, layout/pages sous `src/app/{layout,pages}`; assets dans `public/` copiés vers `dist`.
- UI: NG Zorro comme base; usage de la grille `nz-row`/`nz-col` et `trackBy` pour limiter le churn DOM; composants standalone privilégiés.
- Design system: tokens CSS (`:root`) pour couleurs/espaces/rayons/ombres/typographie (ex: `--color-primary`, `--space-4`, `--radius-md`, `--font-size-md`), intégrés dans `styles` et mappables à NG Zorro; possibilité de thèmes dark/light via data-attribute.
- Styles: SCSS/LESS selon configuration; formatage via `.editorconfig` et Prettier (override HTML dans `package.json`).
- Qualité: tests Jasmine + Karma (`*.spec.ts` à côté des sources), budgets de prod et allowlist CommonJS dans `angular.json`.

2) Liste des changements effectués
- Ajout d’un système RBAC/Workspaces de simulation (localStorage).
- Service `AccessControlService` (utilisateurs, workspaces, droits, mapping ressources↔workspaces, allowlist de templates).
- Header: sélecteur d’utilisateur actif (responsive) + avatar dynamique; menu admin-only (Workspaces, Users, Templates).
- Nouvelles vues: `Workspaces` (gestion + autorisations de templates), `Users` (création/édition de droits) — style aligné aux listes Catalog.
- Filtrage par droits dans les listes: Flows, Forms et Websites n’affichent que les éléments autorisés pour l’utilisateur.
- Création: les nouveaux Flows/Forms sont rattachés automatiquement au workspace par défaut de l’utilisateur.
- Routing et navigation mis à jour (ajout de /workspaces et /users, masquage admin-only côté UI).

3) Fichiers modifiés
- `src/app/services/access-control.service.ts` (nouveau service ACL)
- `src/app/layout/layout-main/layout-main.ts` (sélecteur utilisateur, masquage admin-only)
- `src/app/layout/layout-main/layout-main.html` (UI header + conditions d’affichage)
- `src/app/layout/layout-main/layout-main.scss` (ajustements responsives)
- `src/app/app.routes.ts` (routes /workspaces et /users)
- `src/app/features/workspace/workspace-list.component.ts` (nouvelle vue)
- `src/app/features/users/users-list.component.ts` (nouvelle vue)
- `src/app/features/flow/flow-list.component.ts` (filtrage ACL + mapping à la création)
- `src/app/features/dynamic-form/form-list.component.ts` (filtrage ACL + mapping à la création)
- `src/app/features/website/website-list.component.ts` (filtrage ACL)
- `codex-report.md` (rapport mis à jour)
 - `docs/technical/access-control.md` (documentation RBAC & workspaces)

4) Message Conventional Commits (simulé)
feat(app): workspaces, users, and ACL with header switcher

Body:
- Add `AccessControlService` (users, workspaces, resource mapping, template allowlist).
- Add Workspaces and Users views; update routes and navbar with admin-only visibility.
- Filter Flows/Forms/Websites by user permissions; attach new items to default user workspace.
- Add responsive user switcher in header; update layout styles.

Footer:
Scope: app
