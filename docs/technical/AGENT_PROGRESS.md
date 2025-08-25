Backend Build Progress

Scope
- Express JS backend with multi-tenant Auth, MongoDB models (ObjectId + populate), flows engine (SSE + WS), providers/apps/node-templates/credentials, validation + notifications, plugin registry, transfer/duplicate across workspaces, standardized error envelope.

Delivered
- Core
  - App bootstrap with Mongo lazy boot and health endpoints (SSE).
  - Auth (JWT-like HMAC), company scoping, workspace membership ACL.
  - Standard API envelope and error handler (docs: backend-error-format.md).
- Domain Models
  - Company, User, Workspace, WorkspaceMembership, Provider(+checksum), NodeTemplate(+checksumArgs/Feature), App, Flow, Run, Credential(AES-GCM), Notification.
- Validation & Policies
- NodeTemplate.args (form UI) persisted; backend no longer validates via JSON Schema (Ajv removed from validation path).
  - Graph integrity checks; workspace.templateAllowed enforcement.
  - Force semantics: disable flows + create notifications when accepting invalid changes.
- Engine & Realtime
  - Expression sandbox; start/function/condition; deepRender.
  - Runs persisted with event log + final result; SSE /runs/:id/stream and WS /ws?runId=.
- Plugins
  - File-based registry with local directory (plugins/local) + reload endpoint.
  - Import manifest endpoint with checksum upsert for providers/node-templates.
- CRUD Endpoints
  - Providers: GET, PUT
  - Node Templates: GET, POST, PUT (force semantics)
  - Apps: GET, POST, PUT
  - Credentials: list/create per workspace; get/put by id (encrypted; values not returned)
  - Workspaces: GET list, PUT with policy change and force semantics
  - Flows: list/create per workspace; get/put (populate optional; force semantics)
  - Runs: create, get (populate optional), stream SSE; WS broadcast
  - Transfer: POST /workspaces/:wsId/transfer for flows/apps/credentials (force handled for flows)
  - Notifications: list, ack
  - Plugins: list, reload; Import manifest
  - Admin: reset with reseed

Pending / Next Steps
- Credentials: optional read-back of values for admins; provider-specific validation on shape.
- Engine: full try/catch/skip/loop semantics and subflows; resume/cancel; queue for long tasks.
- Plugins: support remote registries and versioning; per-provider/app handler selection.
- Transfer: include forms if backendized; deep copy linked assets.
- Tests: DB-mode tests for force paths, notifications, plugins import and transfer scenarios.
- Swagger: expand schemas and examples for all endpoints (see docs/api/swagger.yaml).

Updates in this iteration
- Plugins repo model with manifest import + functions:
  - Loader now scans repos and imports manifest.json (providers + node-templates with full metadata).
  - Functions under functions/*.js registered as handlers; engine resolves them.
- Credentials secure read:
  - GET /api/credentials/:id/values returns masked structure; add ?reveal=1 for admin-only plaintext.
  - Encryption key derivation fallback (from HMAC_SECRET) if ENC_KEY not set.
- Transfer improvements: node/edge IDs remapped when copying flows to avoid collisions.
- DB tests added: force validations + notifications; manifest import; transfer.
- Swagger spec updated: docs/api/swagger-backend.yaml covers new routes.
- Swagger UI exposed at /api-docs with JSON/YAML at /api-docs.json and /api-docs.yaml (see docs/technical/api-docs.md).
- Runs model aligned with frontend:
  - status values (queued/running/success/error/cancelled/timed_out/partial_success)
  - finalPayload/result, startedAt/finishedAt/durationMs, msg (per-node logs)
  - list endpoints with pagination (limit/offset) for virtual lists; cancel endpoint
- Engine events include input/argsPre/argsPost/result per node (like simulation UI)
- Socket.IO added alongside SSE:
  - Subscribe via 'subscribe:run' and receive 'run:event' in room 'run:{runId}'. See docs/technical/realtime.md
- Frontend integration checklist added: docs/technical/frontend-todo-integration.md (services to adapt + pagination/filters)

Notes
- Use NODE_ENV=test MONGO_DB_NAME=homeport_test npm run test:db for DB tests.
- Error envelope is the contract for the frontend; code fields are stable.
