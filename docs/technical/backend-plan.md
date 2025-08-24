# Backend Roadmap, Tasks, and Architecture Checklist

This document is the execution playbook for the backend (Express preferred). It sequences modules, lists concrete tasks and deliverables, and links to detailed specs. It reflects all frontend behaviors and simulation logic currently implemented.

Related spec: see `docs/technical/backend-implementation.md` for deep dives (schemas, semantics, and engine behavior).

## Goals
- Multi-tenant SaaS: Company → Workspaces → Resources (flows, forms, websites, credentials, runs).
- Auth-first: all APIs protected; server-side scoping by company/workspace.
- Flow engine parity with the frontend simulation: test/prod modes, start payload lifecycle, credentials resolution, events, wait/merge semantics.
- Clean reset tools to re-seed demo data and force re-authentication.

## Phase 0 — Foundations (Express)
- Tasks
  - Choose stack (Node.js + Express) and set up repo, CI, code quality.
  - Configure environment secrets and crypto keys (for credentials encryption).
  - Add base libs (JWT, bcrypt/argon2, class-validator, Mongo driver/ODM).
- Deliverables
  - Service skeleton + health endpoint `GET /health`.

## Phase 1 — AuthN/AuthZ + Multi-Tenancy (PRIORITY)
- Summary: Users authenticate; every request carries `companyId` in token; all reads/writes scoped server-side.
- Tasks
  - Entities (Mongo recommended):
    - companies { _id, name, plan, createdAt }
    - users { _id, email, name, passwordHash, companyId, role: 'admin'|'member', createdAt }
    - workspaces { _id, companyId, name, createdAt }
  - Endpoints
    - POST /auth/login → JWT { companyId, userId, role }
    - POST /auth/forgot → email token with expiration
    - POST /auth/reset → verify token, set new password
    - POST /auth/change → current → new password (auth required)
  - Guards
    - Require auth on all /api/*; extract and verify JWT.
    - Inject `companyId` in request context; forbid cross-company access.
  - Server-side scoping
    - All handlers must query by `companyId` (and `workspaceId` when relevant).
    - Workspaces list endpoint returns only `workspaces` where `workspace.companyId == token.companyId`.
- Acceptance
  - Login/logout and reset flows work; test user sees only their company workspaces.
- Spec link: `backend-implementation.md` (AuthN/AuthZ, Company & tenancy section).

## Phase 2 — Providers & Credentials
- Tasks
  - Entities
    - providers (catalog)
    - credentials { _id, workspaceId, providerId, name, dataCiphertext, createdAt, updatedAt, valid? }
  - Crypto
    - Envelope encryption (AES-GCM); DEK protected by KEK (KMS/env).
  - Endpoints
    - GET /api/providers
    - GET /api/workspaces/:ws/credentials
    - POST /api/workspaces/:ws/credentials (validate schema, encrypt data)
    - GET /api/workspaces/:ws/credentials/:id
  - Scoping
    - Verify `workspace.companyId == token.companyId` for all credentials ops.
- Acceptance
  - Create/list credentials in authorized workspaces only; decrypt on server, never leak secrets to client.
- Spec link: `backend-implementation.md` (Credentials section).

## Phase 3 — Node Templates (Catalog)
- Tasks
  - Entities: node_templates { _id, key, providerId?, type, name, argsSchema, uiSchema?, allowWithoutCredentials?, createdAt }
  - Endpoints
    - GET /api/node-templates
    - POST /api/node-templates (admin only)
  - Validation: enforce safe names (regex), types.
- Acceptance
  - Templates retrievable; admin can seed/edit.
- Spec link: `backend-implementation.md` (NodeTemplates).

## Phase 4 — Flows CRUD (+ Status/Enabled)
- Tasks
  - Entity: flows { _id, workspaceId, title, description, graph, status: 'draft'|'test'|'production', enabled: boolean, createdAt, updatedAt }
  - Endpoints
    - GET /api/workspaces/:ws/flows
    - POST /api/workspaces/:ws/flows (title/description/status/enabled; graph empty)
    - GET /api/workspaces/:ws/flows/:id
    - PUT /api/workspaces/:ws/flows/:id (graph update)
  - Validation: server validates graph coherence (templates exist, safe node names, credentials exist & belong to workspace).
- Acceptance
  - Frontend create dialog persists status+enabled; lists filter by workspace; editor loads graph by id.
- Spec link: `backend-implementation.md` (Flows CRUD; status/enabled semantics).

## Phase 5 — Execution Engine (Test/Prod)
- Semantics required by frontend:
  - Start payload lifecycle
    - Default is `{ payload: null }` at UI level, persisted per flow; backend does not mutate it.
    - Handlers return a classic object; engine replaces `msg.payload` with that object for next node.
    - Form expression context uses the input object flat (no `{input: ...}` wrapper).
  - Credentials-aware execution
    - Pass `credentials` as a fourth param to handlers (never in `msg.payload`).
    - Resolution order: node.credentialId → template default (if any) → error if required.
  - Modes
    - test: runs on-demand from UI
    - prod: runs triggered by events/endpoints; production triggers fire only when `flow.enabled == true`.
- Tasks
  - Entities: runs, run_attempts (with per-node attempts + timestamps)
  - Endpoints
    - POST /api/workspaces/:ws/flows/:id/runs (mode, input optional)
    - GET /api/workspaces/:ws/runs/:id (status, attempts)
    - GET /api/workspaces/:ws/runs/:id/stream (SSE/WebSocket)
  - Features
    - wait.all (aggregate: payload + provenance) & merge.race semantics
    - cancel, per-node retry policy (exponential backoff)
- Spec link: `backend-implementation.md` (Engine, handler signature, wait/merge). 

## Phase 6 — Events & Endpoints
- Tasks
  - Entities: webhook_endpoints, events_queue
  - Endpoints
    - POST /webhooks/:workspace/:path → ingest event, dedupe by correlationKey
    - (Optional admin) register push/polling for providers
  - Engine: each event spawns an independent run; long-lived listeners managed per flow.
- Acceptance
  - Posting a webhook creates a queued run when enabled & in production mode.
- Spec link: `backend-implementation.md` (Events & listeners).

## Phase 7 — Observability & Admin
- Tasks
  - Structured logs, metrics (latency p95 by template), traces if available.
  - Admin tools
    - Reset: purge business data; preserve companies or reseed demo (ACME/BETA); invalidate sessions.
- Spec link: `backend-implementation.md` (Admin & Outils → Reset multi-tenant).

## Phase 8 — Security & Compliance
- JWT signing key management & rotation policy.
- Rate limiting on public endpoints (/webhooks/*).
- Input validation (schemas) and safe string regex (node/template names).
- Idempotency for webhooks & external actions.

## Endpoints Summary (Minimal)
- Auth: POST /auth/login, /auth/forgot, /auth/reset, /auth/change
- Workspaces: GET /api/workspaces (scoped by company), POST/PUT as needed
- Providers: GET /api/providers
- Credentials: GET/POST /api/workspaces/:ws/credentials, GET by id
- Node templates: GET /api/node-templates, POST (admin)
- Flows: GET/POST/GET by id/PUT /api/workspaces/:ws/flows
- Runs: POST /api/workspaces/:ws/flows/:id/runs, GET /api/workspaces/:ws/runs/:id, GET /stream
- Webhooks: POST /webhooks/:workspace/:path

## Mongo Collections & Indexes (recap)
- companies, users, workspaces
- providers, node_templates
- flows
- credentials
- runs, run_attempts
- wait_all_states, wait_all_arrivals
- webhook_endpoints, events_queue
- Indexes suggested
  - runs(runId), run_attempts(runId,nodeId,attempt)
  - events_queue(correlationKey,workspaceId)
  - webhook_endpoints(path)
  - credentials(providerId,workspaceId)

## Server-side Scoping Rules (hard requirements)
- All list/detail endpoints must enforce:
  - `workspace.companyId == token.companyId` for workspace-scoped resources.
  - Members see/edit only the workspaces they are allowed to access (RBAC/ACL); admins can see all workspaces of their company.
- Never rely on client-side filtering for multi-tenant boundaries.

## Deliverables per Phase
- Source code + tests (unit + minimal integration for endpoints & engine flows).
- Migration/seed scripts (companies ACME & BETA; demo users; sample workspaces).
- README/API docs for each module.
- Updated `backend-implementation.md` when details evolve.

## Acceptance Test Scenarios (extract)
- Auth
  - Login with demo users; forgot/reset/change flows.
  - Cross-company access blocked.
- Workspaces
  - Current user lists only company workspaces; member cannot see others.
- Flows
  - Create with status+enabled; list filtered by workspace; run in test mode.
- Engine
  - Handlers return object replacing msg.payload; credentials passed as param; wait.all & merge.race behave as spec.
- Events
  - Webhook ingests to queue and triggers run only if enabled & prod.
- Reset
  - Reset command purges and forces re-login; seeding restores demo tenants.

## Traceability to Frontend Behaviors
- Start payload editable/persisted; backend treats initial input as-is (no mutation).
- Executions show graph by flow id; runs filter by flow; run visual semantics align with recorded attempts.
- Credentials-aware simulation already mirrors backend expectations; backend should not inject credentials into payloads.

---

For details of schemas and engine semantics, see: `docs/technical/backend-implementation.md`.
