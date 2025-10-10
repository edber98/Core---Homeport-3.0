Frontend Integration TODOs (Backend Switch)

Goal
- Replace simulated services with real backend endpoints, with pagination/filters and virtual lists. This checklist maps endpoints, parameters, and UI work per service.

Envelope
- Every response: { success: boolean, data, requestId, ts }. Unwrap via resp.data || resp.

Auth
- Replace local session with POST /auth/login → save token, store company in ACL service.

Catalog (Providers / Node Templates)
- Providers (Apps): GET /api/providers
  - Map AppProvider.id ↔ Provider.key
  - Use provider.title/iconClass/iconUrl/color/tags
  - Show credentialsForm preview in provider viewer (same form-builder schema)
- Node Templates: GET /api/node-templates
  - Use template.args (form builder schema) and UI meta (title/subtitle/icon/category/tags/group)
  - Normalize template ids: frontend uses tmpl_* internally; backend keys are normalized (strip prefixes)

Credentials
- List by workspace: GET /api/workspaces/:wsId/credentials
- Create: POST /api/workspaces/:wsId/credentials { name, providerKey, values }
- Get summary: GET /api/credentials/:id
- Update: PUT /api/credentials/:id
- Read values: GET /api/credentials/:id/values[?reveal=1] (masked by default; reveal requires admin)

Workspaces
- Read: GET /api/workspaces
- Update policy: PUT /api/workspaces/:wsId { templatesAllowed, force? }
  - On 400 with impacted: show dialog listing flows to update/disable

Flows
- List by workspace: GET /api/workspaces/:wsId/flows
- Create: POST /api/workspaces/:wsId/flows { name, graph, force? }
- Get: GET /api/flows/:flowId[?populate=1]
- Update: PUT /api/flows/:flowId { name?, enabled?, status?, graph?, force? }
  - Handle 400 flow_invalid details: show errors/warnings
  - On force path: reflect disabled state and show notifications badge

Runs (Virtual Lists)
- Start: POST /api/flows/:flowId/runs { payload? }
- Detail: GET /api/runs/:runId
  - Use status: queued|running|success|error|cancelled|timed_out|partial_success
  - Show finalPayload and timeline (startedAt, finishedAt, durationMs)
  - If msg present: surface per-node logs (argsPre/argsPost/input/result) like simulation
- Stream: GET /api/runs/:runId/stream (SSE); optional WS: /ws?runId=...
- Cancel: POST /api/runs/:runId/cancel
- List by workspace: GET /api/workspaces/:wsId/runs?flowId=&status=&limit=&offset=
- List by flow: GET /api/flows/:flowId/runs?status=&limit=&offset=
- Latest by workspace: GET /api/workspaces/:wsId/runs/latest[?flowId]
- UI: Implement virtual scroll using limit/offset; default page size 20; cap at 100
  - Store last loaded page tokens per flow/workspace to avoid reloading
  - Add status filter buttons (All/Running/Success/Error)
  - Add retry of failed runs from list (POST start)

Notifications
- GET /api/notifications[?workspaceId=&entityType=&entityId=&acknowledged=]
- POST /api/notifications/:id/ack
- Show critical notifications after force updates (disable flows) with deep link /flows/:id/editor

Plugins/Repos (Admin)
- List plugins: GET /api/plugins; reload: POST /api/plugins/reload
- Manage repos: GET/POST/PUT /api/plugin-repos; POST /api/plugin-repos/reload
- Manifest import: POST /api/plugins/import-manifest (admin)

Pagination/Filters (Standard)
- limit: page size (default 20; max 100)
- offset: starting index (default 0)
- status: filter for runs
- flowId: filter for runs in workspace
- Populate: use ?populate=1 where supported (flows/runs)

Migration Checklist
- Replace CatalogService listApps/listNodeTemplates to call backend
- Replace FlowRunService with backend adapter:
  - run(): POST /flows/:id/runs and subscribe SSE/WS; push into a BehaviorSubject for UI
  - list(): call workspace/flow runs with pagination for virtual lists
  - cancel(): POST /runs/:id/cancel
  - previous execution: GET latest endpoints
- Replace ad-hoc local simulation in flow-builder to show back’s last/current run status
- Add NotificationService to fetch/ack notifications and show banners

Error Handling
- Use backend envelope; show error.message; handle force options and impacted lists for flows/policy changes

