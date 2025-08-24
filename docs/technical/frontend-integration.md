Frontend Integration Guide (Angular → Backend)

Overview
- The backend exposes REST endpoints with a standard envelope and SSE/WS for realtime. This guide maps frontend service types and fields to backend models and endpoints to ease migration.

Envelope
- Success: { success: true, data, requestId, ts }
- Error: { success: false, error: { code, message, details }, requestId, ts }
- Always unwrap data in frontend services (e.g., resp.data || resp).

Auth
- POST /auth/login → { token, user, company }
- Use Bearer token on all /api/*

Company & Workspaces
- GET /api/company → Company { id, name }
- GET /api/workspaces → Workspace[]
- Workspace fields: { id, name, templatesAllowed: string[] }
- templatesAllowed holds NodeTemplate keys (normalized), not UI “id”.

Providers (aka Apps/Integrations)
- GET /api/providers → Provider[]
- Mapping vs frontend AppProvider:
  - id (frontend) ↔ key (backend)
  - name/title/iconClass/iconUrl/color/tags (same fields)
  - hasCredentials/allowWithoutCredentials/credentialsForm (same semantics)

Node Templates (Catalog)
- GET /api/node-templates → NodeTemplate[]
- Field mapping vs frontend NodeTemplate:
  - id (frontend) ↔ key (backend)
  - type, name, title, subtitle, icon, category, description, tags, group (same semantics)
  - appId (frontend) ↔ appName/providerKey (backend) — templates can link to provider/app by name or key
  - args (frontend UI form) ↔ args (backend)
  - output: string[]; authorize_catch_error/authorize_skip_error; allowWithoutCredentials; output_array_field (condition)
  - Template “id” used in flows becomes template key after normalization (e.g., 'tmpl_http' → 'http')

Flows
- GET /api/workspaces/{wsId}/flows → Flow[]
- POST /api/workspaces/{wsId}/flows (body: { name, status?, enabled?, graph, force? })
- GET /api/flows/{flowId}[?populate=1]
- PUT /api/flows/{flowId} (same body; force to accept invalid graph and disable + notify)
- Graph nodes store model with templateObj mirrored from frontend; backend converts template IDs to keys for validation/handlers.
- Validation: graph + workspace.template policy (plus checks de drift features); la validation fine des champs est pilotée par le form builder (args) côté frontend. Force=false → 400 avec détails; force=true → désactivation + notification.

Runs & Realtime
- POST /api/flows/{flowId}/runs (payload optional); 409 if flow disabled.
- GET /api/runs/{runId} (append ?populate=1 for flow/workspace)
- GET /api/runs/{runId}/stream (SSE)
- WS: ws://host:port/ws?runId=... → JSON events

Credentials
- GET /api/workspaces/{wsId}/credentials → CredentialSummary[]
- POST /api/workspaces/{wsId}/credentials { name, providerKey, values } (values encrypted at rest)
- GET /api/credentials/:id → summary (no values)
- PUT /api/credentials/:id { name?, providerKey?, values? } (re-encrypt)
- GET /api/credentials/:id/values[?reveal=1]
  - default masked structure; reveal requires admin role
- Frontend providerId ↔ backend providerKey

Apps (per workspace)
- GET /api/workspaces/{wsId}/apps → App[]
- POST /api/workspaces/{wsId}/apps → create
- PUT /api/apps/{id} → update

Plugins (Repo-like)
- Directory structure per repo:
  - manifest.json: providers[] and nodeTemplates[] (full UI metadata)
  - functions/*.js: exports.key and exports.run(node, msg, inputs)
- Loader scans backend/src/plugins/local/* and backend/src/plugins/repos/*
- API:
  - GET /api/plugins
  - POST /api/plugins/reload (admin)
  - POST /api/plugins/import-manifest (manual upsert)
  - GET /api/plugin-repos, POST /api/plugin-repos, PUT /api/plugin-repos/:id (manage external repos)
- Manifest mappings:
  - Provider: keys + UI + credential form
  - NodeTemplate: all UI + args + linkage to provider/app; checksums ensure idempotent updates

Transfer / Duplicate
- POST /api/workspaces/{wsId}/transfer
- Body: { targetWorkspaceId, force?, items: [{ type: 'flow'|'credential'|'app', id }] }
- Flows: graph node IDs and edges remapped to avoid collisions; validate against target policy (force semantics supported)

Notifications
- GET /api/notifications[?workspaceId=&entityType=&entityId=&acknowledged=]
- POST /api/notifications/{id}/ack
- Emitted on force updates that disable flows (workspace policy changes, template schema updates, flow invalid graphs)

Health
- GET /api/health/db → DB status (mode, state, url)
- GET /api/health/db/stream → SSE events (connecting/connected/error/disconnected)

Envelope Handling in Angular
- Add a small helper: unwrap = (resp) => resp?.data ?? resp
- Always map backend keys:
  - Template key ↔ frontend template id normalization (strip prefixes 'tmpl_', 'template_', 'fn_', 'node_').
  - AppProvider id ↔ Provider key.

Security & ACL
- All /api/* require Bearer token; workspace routes verify membership (WorkspaceMembership).
- Company scoping checks on every object (workspaceId.companyId must match req.user.companyId).

Checksums & Drift
- Provider.checksum; NodeTemplate.checksumArgs/Feature detect changes from manifests (args used for checksum).
- On drift (template args/feature updates): backend peut refuser des modifs sans force=true et désactiver les flows impactés avec notifications.

OpenAPI
- Full spec: docs/api/openapi-backend.yaml — import into Swagger UI/Postman; models reflect frontend UI fields.
