# Dynamic Form Feature – Components and Services

This document summarizes the building blocks in `src/app/features/dynamic-form` and how they work together.

## Components

- `dynamic-form-builder.component` (standalone)
  - The main UI for building a form schema (left tree/context, center live preview, right inspector in template).
  - Delegates heavy logic to services: tree, condition form, preview, issues, deps, actions, state, factory.

- `components/context-panel.component`
  - Left-side palette and structure tree (`nz-tree`), emits context-menu events and import/export strings.

- `components/condition-builder.component`
  - Query-builder style modal content to compose conditions (`visibleIf`, `requiredIf`, `disabledIf`).
  - Presents rules and (any/all) groups inline, including nested; communicates via Outputs to the builder.

- `components/inspector-*.component`
  - Inspector subpanels for Form, Step, Section, Field properties.
  - Avoids bloating the builder with template logic.

- `components/options-builder.component`
  - Small editor for select/radio options.

- `components/style-editor.component`
  - Re-usable style editor (colors, border, spacing) used by builder dialogs.

## Key Services

- `services/builder-tree.service`
  - Generates stable keys for the left tree and resolves keys back to schema objects.
  - Handles drag & drop moves with guardrails (no dropping into own subtree, etc.).

- `services/builder-ctx-actions.service`
  - Centralized mutations for context menu and in-preview editing (add/delete/move).
  - Resolves keys via `parseKey` + path walk to avoid brittle lookups.

- `services/builder-factory.service`
  - Factories for creating new `field`, `section`, and `step` with consistent defaults.

- `services/builder-state.service`
  - Centralizes current selection (`selected`, `selectedField`) so any component can reference the same state.

- `services/condition-form.service`
  - Builds `FormGroup` structures for conditions and converts to/from JSON logic.
  - High-level helpers: `seedFormFromJson`, `buildJsonString`.

- `services/builder-preview.service`
  - Utilities to introspect rules, simulate values, and describe rules for display.

- `services/builder-issues.service`
  - Computes warnings/errors from the current schema (missing keys, invalid refs, etc.).

- `services/builder-deps.service`
  - Finds condition dependencies for impact previews.

## Data Flow

- Tree actions (right-click): context panel emits events → builder maps to `BuilderCtxActionsService` → schema mutated → `rebuildTree()` and preview refresh.
- Condition builder: builder uses `ConditionFormService` to seed from current JSON, user edits in dialog, then builder saves via `buildJsonString` back into the inspector control.
- Selection: builder reads/writes `selected` and `selectedField` through `BuilderStateService` so preview and inspector stay in sync.

## Conventions

- All standalone components follow Angular style guide; inputs/outputs first, lifecycle next.
- File names in kebab-case; classes in PascalCase.
- Prefer services for logic and components for templates/interaction.

## Extending

- To add a new field type: extend `BuilderFactoryService.newField`, and ensure the renderers under `src/app/modules/dynamic-form` support it.
- To add a new context action: implement it in `BuilderCtxActionsService`, then wire a menu item from `context-panel.component` to the builder method that calls the service.

