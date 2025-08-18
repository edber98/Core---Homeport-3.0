# Homeport Backend Blueprint — Domain, Types, API, Execution

Date: 2025-08-18

Purpose: consolidate existing frontend data structures and behavior into a precise backend blueprint to kick off implementation. Complements and cross-references the existing backend docs in docs/backend/flows-and-forms-backend.md and docs/backend/flow-builder-catalog.md.


## Scope & Goals
- Provide a complete inventory of types used by the frontend (forms, flows, templates, UI builder, catalog, dashboard, expressions).
- Map these types to backend domain entities, storage schemas, and DTOs.
- Define REST APIs (and optional events) to support current UI capabilities and future flow execution.
- Specify execution semantics (condition branches, error branch, outputs) aligned with the Flow Builder logic.
- Outline security, multi-tenant, versioning, and migration from localStorage to backend.


## Frontend Types Inventory (Ground Truth)

Sources are referenced by relative paths. These TypeScript shapes are the contracts we must preserve across the wire.

- Dynamic Form Module (src/app/modules/dynamic-form/dynamic-form.service.ts)
  - Field types:
    - `FieldTypeInput = 'text'|'textarea'|'number'|'select'|'radio'|'checkbox'|'date'`
    - `FieldType = FieldTypeInput | 'textblock' | 'section' | 'section_array'`
  - Validators: `FieldValidator = { type: 'required'|'min'|'max'|'minLength'|'maxLength'|'pattern'; value?; message? }`
  - Field configs (union):
    - `InputFieldConfig` (has `key: string`)
    - `TextBlockFieldConfig` (no `key`)
    - `SectionFieldConfig` (has `fields: FieldConfig[]`, optional `mode: 'normal'|'array'`, `key` required if array, and `array` controls, plus `ui` overrides)
    - Shared props: `label`, `placeholder`, `description`, `options`, `default`, `validators`, rules (`visibleIf`, `requiredIf`, `disabledIf`), responsive `col`, `itemStyle`, `expression` toggle.
  - Schema & UI:
    - `FormSchema = { title?; ui?: FormUI; steps?: StepConfig[]; fields?: FieldConfig[]; summary?: SummaryConfig }`
    - `FormUI` includes layout, alignment, label/control cols, width, containerStyle, and action bar customization (`submitBtn`, etc.)
    - `SummaryConfig` toggles final summary and date format.
  - Rules evaluation: `evalRule(rule, form)` supports operators: `var`, `not`, `all`, `any`, `==`, `!=`, `>`, `>=`, `<`, `<=`.
  - Behavior invariants to keep backend-compatible:
    - `requiredIf` takes precedence over static `required` (validators array). Invisible or disabled fields must not be required.
    - `neutralize` ensures no `undefined` in values by type (checkbox=false; number/select/radio/date=null; text/textarea='').

- Dynamic Form Builder (src/app/features/dynamic-form/services/*)
  - Tree addressing:
    - Stable keys scheme for nz-tree with step and nested field markers (e.g., `step:0:field:1:field:2`).
    - `BuilderTreeService.keyForObject()` and `ctxFromKey()` maintain consistent selection and DnD.
  - Issues validation:
    - `BuilderIssuesService` reports duplicate field `key`s and invalid rule variable references.
  - Factory defaults:
    - `BuilderFactoryService` provides default `Step`, `Section`, `Array Section`, and `Field` blueprints.

- Catalog Service (src/app/services/catalog.service.ts)
  - Local storage mock types:
    - `FlowSummary = { id, name, description? }`
    - `FlowDoc = { id, name, nodes?: any[], edges?: any[], meta?: any, description? }`
    - `FormSummary = { id, name, description? }`
    - `FormDoc = { id, name, schema?: any, description? }`
    - `NodeTemplate = { id, type: 'start'|'function'|'condition'|'loop'|'end', name, category?, appId?, tags?, group?, description?, args?, output?, authorize_catch_error? }`
    - `AppProvider = { id, name, title?, iconClass?, iconUrl?, color?, tags? }`
  - Export/Import payload example (stringified JSON):
    - `{ kind: 'homeport-catalog', version: 1, exportedAt, flows, flowDocs, forms, formDocs, templates, apps }`

- Flow Builder Domain (selected logic)
  - Output handles computation (src/app/features/flow/flow-graph.service.ts):
    - start: `['out']`, end: `[]`, loop: `['loop_start','loop_end','end']`.
    - function: default numeric handles `['0','1',...]` based on `template.output`, plus `'err'` when `authorize_catch_error && model.catch_error`.
    - condition: dynamic handles from `model.context[output_array_field]` by index or `_id` (preserve connected handles across edits).
  - Human-readable output names mirror the above and resolve condition item labels.
  - Palette grouping by `appId` (src/app/features/flow/flow-palette.service.ts) referencing `AppProvider`.
  - Builder seed and item templates align with `NodeTemplate` (src/app/features/flow/flow-builder.component.ts).

- Expression Engine (src/app/features/dashboard/components/expression-editor-testing-component/expression-sandbox.service.ts)
  - Context normalization: exposes both `json/$json`, `env/$env`, `node/$node`, `now/$now`.
  - `{{ ... }}` islands with safety gate: no statements, allow `new Date(...)`, block globals like `window`, disallow bare assignment.
  - Returns either raw evaluation (single island) or interpolated string with per-island error reporting.

- UI Builder (optional persistence target)
  - `UiNode` tree: `{ id, tag, text?, classes?, attrs?, style?, styleBp?, children? }` (src/app/features/ui/ui-model.service.ts)
  - UI Class Manager: `UiClassDef = { name, parts, styles: { [state in 'base'|'hover'|'active'|'focus']?: { base?: CSS, bp?: { [bp]: CSS } } } }` (src/app/features/ui/services/ui-class-style.service.ts)
  - Breakpoints: `UiBreakpoint in 'xs'|'sm'|'md'|'lg'|'xl'` (src/app/features/ui/services/ui-breakpoints.service.ts)

- Dashboard Types (src/app/features/dashboard/dashboard.service.ts)
  - `DashboardKpis = { executions: number[], errors: number[], avgLatencyMs: number[], activeNodes: number }`
  - `ChannelStat = { label, value }`, `ActivityItem = { icon, title, time }`, `FunctionStat = { name, success, error, avgMs }`


## Backend Domain Model (Mapping)

The backend should persist and serve the above structures with minimal impedance. Proposed entities/tables (PostgreSQL with JSONB) or MongoDB collections equivalently.

- Organizations & Projects (multi-tenant)
  - `org(id, name, createdAt)`
  - `project(id, orgId, name, createdAt)`

- Flows
  - `flow_definition(id, orgId, projectId, name, description, nodes_json JSONB, edges_json JSONB, status 'draft'|'archived', createdAt, updatedAt)`
  - `flow_version(id, flowId, version, nodes_json JSONB, edges_json JSONB, publishedAt)`
  - `flow_execution(id, flowVersionId, startedAt, finishedAt?, status 'running'|'success'|'error'|'canceled', metrics_json JSONB, context_json JSONB)`

- Forms
  - `form_definition(id, orgId, projectId, name, description, schema_json JSONB, status, createdAt, updatedAt)`
  - `form_version(id, formId, version, schema_json JSONB, publishedAt)`

- Node Templates & Apps
  - `node_template(key PRIMARY KEY, name, type, category?, appId?, tags TEXT[], group?, authorize_catch_error BOOLEAN, args_schema_json JSONB, output TEXT[])`
  - `app_provider(id PRIMARY KEY, name, title?, iconClass?, iconUrl?, color?, tags TEXT[])`

- UI Builder (optional)
  - `ui_design(id, orgId, projectId, name, tree_json JSONB, classes_json JSONB, createdAt, updatedAt)`

- Dashboard / Telemetry (append-only)
  - `flow_run_log(id, execId, ts, level, event, data_json JSONB)`
  - `function_stat_daily(date, orgId, projectId, functionName, success, error, avgMs)`

Invariants and behavior to enforce server-side:
- Condition node outputs: preserve stable `items[i]._id` for edges; only delete edges when the corresponding output handle is removed (see docs/backend/flows-and-forms-backend.md for reconciliation algorithm).
- Function nodes: allow `'err'` branch only when template authorizes and instance enables `catch_error`.
- Dynamic Form required precedence: if `requiredIf` is defined and true, add required; hidden/disabled fields must not be required.


## API Design (REST)

Base prefix: `/api/v1`. All endpoints scoped by `orgId` and `projectId` either in URL (`/orgs/:orgId/projects/:projectId/...`) or via JWT claims; choose one strategy and stick to it.

- Catalog: Node Templates and Apps
  - `GET /catalog/templates` → `NodeTemplate[]`
  - `GET /catalog/templates/:key` → `NodeTemplate`
  - `POST /catalog/templates` (create/update) body: `NodeTemplate`
  - `DELETE /catalog/templates/:key`
  - `GET /catalog/apps` → `AppProvider[]`
  - `GET /catalog/apps/:id` → `AppProvider`
  - `POST /catalog/apps` (create/update) body: `AppProvider`
  - `DELETE /catalog/apps/:id`

- Flows
  - `GET /flows` → `FlowSummary[]`
  - `GET /flows/:id` → `FlowDoc` (nodes, edges, meta)
  - `POST /flows` → create draft `FlowDoc`
  - `PUT /flows/:id` → update nodes/edges (apply edge reconciliation for conditions)
  - `DELETE /flows/:id`
  - `POST /flows/:id/publish` → create `FlowVersion` and return `{ versionId }`
  - `POST /flows/:id/run` → trigger an execution (sync or async)
  - `GET /flows/:id/executions` → list `FlowExecution[]`
  - `GET /executions/:execId` → `FlowExecution`

- Forms
  - `GET /forms` → `FormSummary[]`
  - `GET /forms/:id` → `FormDoc`
  - `POST /forms` → create draft
  - `PUT /forms/:id` → update `schema`
  - `DELETE /forms/:id`
  - `POST /forms/:id/publish` → create `FormVersion`

- Export / Import (project-level)
  - `GET /export` → same payload shape as CatalogService export (flows+forms+templates+apps)
  - `POST /import?mode=replace|merge` body: payload above

- Dashboard
  - `GET /stats/kpis` → `DashboardKpis`
  - `GET /stats/functions?from=...&to=...` → `FunctionStat[]`
  - `GET /activity/recent` → `ActivityItem[]`

- UI Builder (optional)
  - `GET /ui/designs` → list
  - `GET /ui/designs/:id` → `UiNode` tree + `UiClassDef[]`
  - `POST /ui/designs` (create/update)
  - `DELETE /ui/designs/:id`

DTOs should mirror the frontend types listed earlier. Prefer using Zod/class-transformer validators to enforce contracts and helpful error messages.


## Execution Semantics

Align with frontend FlowGraphService:
- Output handle computation:
  - start: `['out']`, end: `[]`, loop: `['loop_start','loop_end','end']`.
  - condition: dynamic from `items` with stable `_id`; else branch optional with its own `_id`.
  - function: numeric handles based on template `output` array; optional `'err'` when authorized and enabled per node instance.
- Edge labeling/names: use template `output` names where present; condition uses item `label`.
- Error propagation: when an edge originates from `err` handle or a node marked invalid, mark downstream nodes as error-branch candidates (used in UI). Backend should carry an `isErrorBranch` flag per transition for observability.
- Expressions: adopt the same safety gates as ExpressionSandboxService. Context keys supported: `json/$json`, `env/$env`, `node/$node`, `now/$now`. Prefer a dedicated evaluator module reusable in both UI and backend to avoid drift.


## Security, Tenancy, Versioning
- AuthN: JWT/OIDC; include `orgId`, `projectId`, and scopes.
- AuthZ: simple RBAC (admin/editor/viewer) at project level; fine-grained resource ownership if needed.
- Versioning: immutable `flow_version` and `form_version` on publish; `flow_definition`/`form_definition` remain mutable drafts.
- Audit: interceptors to record `who/when/what` for changes and publishes.


## Migration Plan (LocalStorage → Backend)
1) Backend implements Catalog, Flows, Forms, Apps endpoints with the same DTO shapes as CatalogService.
2) Add an Angular environment flag `useBackend=true` to switch CatalogService to HTTP implementation (keep current LS-based service for offline/demo).
3) Implement export/import endpoints to allow bulk migration from existing users via the current export JSON.
4) Gradually add execution endpoints and telemetry once design is validated.


## Implementation Kickoff Checklist
- Monorepo suggestion: `apps/api` (NestJS), `apps/web` (existing Angular), `packages/shared` (types for DTOs shared by both).
- Database: generate Prisma schema with the tables listed; run initial migration.
- Modules skeleton:
  - `CatalogModule` (templates, apps)
  - `FlowsModule` (definitions, versions, executions)
  - `FormsModule` (definitions, versions)
  - `ExportModule`
  - `StatsModule`
  - `AuthModule` (JWT guard)
- CI: type-check, test, and build. Add e2e minimal tests for the critical endpoints.


## Appendix — Example Payloads

- FlowDoc (draft):
```json
{
  "id": "flow_abc",
  "name": "Demo HTTP → Condition",
  "description": "Start → HTTP → Condition",
  "nodes": [
    { "id": "n1", "name": "Start", "template": "tmpl_start", "templateObj": { "id": "tmpl_start", "type": "start" }, "context": {}, "position": { "x": 100, "y": 100 } },
    { "id": "n2", "name": "HTTP", "template": "tmpl_http", "templateObj": { "id": "tmpl_http", "type": "function", "output": ["Success"] }, "context": { "url": "https://api" } },
    { "id": "n3", "name": "Condition", "template": "tmpl_condition", "templateObj": { "id": "tmpl_condition", "type": "condition", "output_array_field": "items" }, "context": { "items": [{ "_id": "A", "name": "VIP" }, { "_id": "B", "name": "Other" }] } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "sourceHandle": "out", "target": "n2", "targetHandle": "in" },
    { "id": "e2", "source": "n2", "sourceHandle": "0", "target": "n3", "targetHandle": "in" },
    { "id": "e3", "source": "n3", "sourceHandle": "A", "target": "nX", "targetHandle": "in" }
  ]
}
```

- FormDoc:
```json
{
  "id": "form_1",
  "name": "Send Mail",
  "schema": {
    "title": "Send Mail",
    "ui": { "layout": "vertical" },
    "fields": [
      { "type": "text", "key": "dest", "label": "Dest", "default": "", "expression": { "allow": true } },
      { "type": "text", "key": "subject", "label": "Sujet", "default": "" },
      { "type": "textarea", "key": "body", "label": "Body" },
      { "type": "checkbox", "key": "acr", "label": "Accusé de reception", "default": false }
    ]
  }
}
```

- NodeTemplate:
```json
{
  "id": "tmpl_http",
  "type": "function",
  "name": "HTTP Request",
  "category": "HTTP",
  "appId": null,
  "authorize_catch_error": true,
  "output": ["Success"],
  "args": { "fields": [ { "type": "text", "key": "url", "label": "URL" } ] }
}
```


References
- docs/backend/flows-and-forms-backend.md — primary architecture and execution rules.
- docs/backend/flow-builder-catalog.md — node catalog conventions and contracts.
 - docs/backend/dynamic-forms-blueprint.md — full dynamic form schema, validators, rules and payloads.
  - docs/backend/node-templates-and-providers.md — linkage between Node Templates, App Providers, Flow Builder, and Dynamic Forms.
  - docs/backend/ui-builder-blueprint.md — UI Builder domain (UiNode tree, classes, breakpoints) and APIs.
  - docs/backend/flow-builder-blueprint.md — Flow Builder domain, graph operations, algorithms, APIs.
  - docs/backend/dynamic-form-builder-blueprint.md — Dynamic Form Builder UX/domain, tree operations, algorithms.
