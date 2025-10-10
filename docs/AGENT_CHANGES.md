Dynamic Form Builder — fixes and refactor (2025-08-13)

Changes
- Fix: context-menu actions on sections under steps now target the correct node.
  - Standardized tree keys for nested sections to always use the ':field' marker at each level.
  - Aligned keyForObject with the same scheme to keep tree selection/expansion consistent.
- Fix: Condition Builder renders rules inline within any/all groups, including nested groups.
- Refactor: extracted tree context actions (add/delete field/section) into a dedicated service `BuilderCtxActionsService` to reduce component size and centralize logic.

Files
- src/app/features/dynamic-form/services/builder-tree.service.ts
- src/app/features/dynamic-form/components/condition-builder.component.html
- src/app/features/dynamic-form/services/builder-ctx-actions.service.ts (new)
- src/app/features/dynamic-form/dynamic-form-builder.component.ts (uses new service)

Impact
- Right-click on a section within a step: '+ Field', '+ Section', and 'Supprimer' operate on the intended section.
- Condition Builder rules are aligned inline for better readability at all nesting levels.
General maintenance — build + test alignment (2025-08-14)

Changes
- Updated `src/app/app.spec.ts` to assert the presence of `router-outlet` instead of an `h1` title that does not exist in the current template.
- Verified Angular build in development configuration; output generated under `dist/Homeport`.

Notes
- Attempted to run Karma tests with ChromeHeadless; encountered a Node.js 24 stream error from the Angular Karma builder in this sandbox. Tests likely pass locally on Node 20/22. The spec fix above prevents a false failure when running tests.
Expression Editor — generalized completions, functions, and error mode (2025-08-14)

Changes
- Generalized deep autocompletion to any context root (not only `$json`).
- Added optional function suggestions with argument placeholders via `[functionSpecs]`.
- Closed the suggestion menu when no items match the prefix.
- Highlight now covers braces too; added error mode with red/green coloring per island.
- Added a small toggle in the header to enable error mode and show validity.

Files
- src/app/features/dashboard/components/expression-editor-testing-component/expression-editor-testing-component.ts
- src/app/features/dashboard/components/expression-editor-testing-component/expression-editor-testing-component.html
- src/app/features/dashboard/components/expression-editor-testing-component/expression-editor-testing-component.scss
- src/app/features/dashboard/components/expression-editor-testing-component/expression-completions.ts
- src/app/features/dashboard/components/expression-editor-testing-component/expression-sandbox.service.ts
- src/app/features/dashboard/pages/dashboard-stats/dashboard-stats.ts (demo function specs)
- src/app/features/dashboard/pages/dashboard-stats/dashboard-stats.html (bind functionSpecs)

Usage
- In templates: `<app-expression-editor-testing-component [context]="ctx" [functionSpecs]="{ add: { args: ['a','b'] } }">`.
- Toggle "Erreur" to enable validation coloring. Valid islands turn green, invalid red.
## start_form — Nouveau type de nœud (Start avec formulaire)

- Ajout d’un type `start_form` distinct de `start`.
- Le runtime traite `start_form` comme un start (entrée du flow) mais le front attache l’UI formulaire (panneau Output, ouverture au lancement si payload vide).
- Le schéma de formulaire est lu prioritairement depuis `node.context` (fallback `startFormSchema`/`args`).
- En public, l’endpoint `GET /api/public/flows/{flowId}/public-form` renvoie le schéma (context prioritaire).
- L’endpoint `POST /api/public/flows/{flowId}/runs` accepte un `payload` qui devient le `result` du `start_form`.

### Backend

- `engine/index.js` et `utils/validate.js`: normalisent `start_form` en type logique `start`.
- Endpoints publics (DB et mémoire) mis à jour pour préférer `start_form` au lieu de `start`.
- Manifest local (démo): la template "Start (Form)" a désormais `type: start_form`.

### Frontend (Angular)

- Graph/viewer: `start_form` est start-like (0 input, 1 output label "Success").
- Builder: ouverture automatique de la dialog Start Form lors d’un lancement si payload vide.
- Exécutions: prompt modal pour payload si `start_form` en tête.
- Public: la page charge le schéma via `node.context`.

### Swagger

- `docs/api/swagger-backend.yaml`:
  - `components.schemas.NodeTemplate.type` inclut `start_form` (+ `event`, `endpoint`).
  - Ajout des endpoints publics `GET /api/public/flows/{flowId}/public-form` et `POST /api/public/flows/{flowId}/runs`.
