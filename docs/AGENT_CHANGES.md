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
