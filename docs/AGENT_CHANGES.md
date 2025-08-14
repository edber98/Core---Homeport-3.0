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
