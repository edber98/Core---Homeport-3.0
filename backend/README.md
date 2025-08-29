## Homeport Backend (Express, JS)

Overview
- Express backend implementing AuthN/AuthZ, multi-tenant (company/workspace), flows CRUD + in-memory engine with SSE streaming for run events.
- This folder is standalone: its own package.json, deps, tests. See docs in ../../docs/technical/* for full spec; this is Phase 1 skeleton with in-memory storage.

Quick Start
- Install: npm i
- Dev: npm start (listens on PORT, default 5055)
- Test: npm test

Endpoints (initial)
- POST /auth/login → token, user, company
- GET  /auth/me → current user
- GET  /api/company → current company
- GET  /api/workspaces → list scoped to company
- POST /api/workspaces/:wsId/flows → create flow
- GET  /api/workspaces/:wsId/flows → list flows
- GET  /api/flows/:flowId → flow detail
- POST /api/flows/:flowId/runs → start run (payload optional)
- GET  /api/runs/:runId → run state
- GET  /api/runs/:runId/stream → SSE stream of events
- POST /api/admin/reset → reset + reseed (ACME/BETA)

Notes
- Auth uses HMAC-signed tokens (JWT-like) with crypto; passwords hashed with scrypt.
- Storage is in-memory maps for now. Swap with DB per backend-express-structure.md.
- Engine integrates expression-sandbox and flow execution example, adapted to SSE events.

