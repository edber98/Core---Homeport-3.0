Flow Update Validation & Notifications

Goals
- Prevent breaking changes from silently disabling automations.
- Validate flow graphs and arguments on create/update; enforce workspace template policy.
- Provide a force mode to accept changes while disabling the flow and creating actionable notifications.

Validation Rules (summary)
- Graph integrity: single Start, all edges reference existing nodes.
- Templates: function nodes must reference a known Node Template.
- Args (form): pas de validation JSON Schema côté backend; la validation fine est assurée côté frontend, et le backend applique uniquement les règles de graph + policy (templatesAllowed) et drift sur features.
- Workspace policy: if workspace.templatesAllowed is non-empty, only listed templates are accepted.
- Future: add drift check for templateChecksum/featureSig per node (see flow-execution-semantics.md, node-validation-rules.md).

API Behavior
- Create flow: POST /api/workspaces/:wsId/flows
  - Valid graph → 201 { success:true, data: flow }
  - Invalid graph without force → 400 { success:false, error:{ code:'flow_invalid', details:{ errors, warnings } } }
  - Invalid graph with force=true → 201; flow.enabled=false; critical Notification created; response includes validation in data.validation.
- Update flow: PUT /api/flows/:flowId
  - Valid patch → 200 { success:true, data: flow }
  - Invalid patch without force → 400 flow_invalid with details
  - Invalid patch with force=true → 200; flow.enabled=false; critical Notification logged
- Start run: POST /api/flows/:flowId/runs
  - If flow.enabled=false → 409 { success:false, error:{ code:'flow_disabled' } }

Notifications
- Model: Notification(companyId, workspaceId, entityType, entityId, severity, code, message, details, link, acknowledged)
- Endpoints:
  - GET /api/notifications[?workspaceId=&entityType=&entityId=&acknowledged=]
  - POST /api/notifications/:id/ack → mark acknowledged
- Typical codes: flow_invalid, template_not_allowed, args_invalid, template_unknown
- Frontend UX: show a banner/toast linking to link (e.g., /flows/:id/editor); group by workspace.

Transactions
- When creating multiple dependent records (e.g., workspace + membership), wrap in DB session (see db/mongo.withTransaction).

Envelope
- All responses use the standard envelope (see backend-error-format.md).
