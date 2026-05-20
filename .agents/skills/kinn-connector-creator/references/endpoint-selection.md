# Endpoint Selection

The goal is not to expose every API endpoint. The goal is to create complete coverage of the provider surfaces that are useful in workflow automation.

Avoid two failure modes:

- **API mirror**: adding admin, billing, analytics-only, governance, or duplicate endpoints just because they exist.
- **Thin starter connector**: adding only one or two obvious actions while leaving out documented lifecycle or workflow actions users would naturally expect.

## Selection Process

1. Identify the provider's primary workflow objects: examples include contacts, companies, deals, tickets, issues, projects, pages, tasks, files, messages, comments, users, groups.
2. For each object, include the automation lifecycle when supported:
   - list/search;
   - get;
   - create;
   - update;
   - delete/archive/restore;
   - add comment/note/message;
   - assign, tag, link, move, change status.
3. Add product-specific workflow verbs when they are central to the provider: run, execute, crawl, scrape, extract, generate, transcribe, synthesize, deploy, query, upsert, rerank, embed, alert, monitor, publish, or trigger.
4. Add event/webhook triggers if they unlock automation starts.
5. Add file operations only if they integrate with Homeport file helpers or return stable URLs/metadata.
6. For automation/control platforms (for example home automation, IoT, observability, infrastructure), include workflow-actionable operational endpoints even when they are not classic business objects: list current states/resources, call actions/services, fire events, read schedules/calendars, fetch current media/snapshots, validate configuration, and read bounded error/status logs that can drive alerts.
7. Keep advanced/rare endpoints out unless the user explicitly asks.

Before implementing, make a short coverage inventory in your reasoning. It should answer:

- What are the central workflow objects?
- Which lifecycle/action verbs are useful for each object?
- Which webhook/event nodes should exist?
- Which documented surfaces are excluded, and why?

## Include

- CRUD for central business objects.
- Search/list nodes with filters and pagination.
- Communication actions: send message, create comment, add note.
- Workflow state changes: close issue, move task, update status, assign user.
- Webhook events with a generic payload schema.
- User/team lookup when needed to drive assignment and filtering.
- Calendars/schedules and event inventories when workflows can branch on time windows or available event types.
- Diagnostic status/error endpoints when the output can feed monitoring, alerting, or remediation flows.
- Media snapshot/download endpoints when they return stable file data or metadata usable by later nodes.
- Intent/command endpoints when the provider exposes them as a supported automation surface.
- AI/model endpoints that produce workflow data: chat, completion, structured extraction, embeddings, rerank, model execution, prediction status, transcription, speech generation, image/video generation, and result retrieval.
- Data/vector operations that are core to retrieval workflows: upsert, query/search, fetch/retrieve, delete, collection/index stats, and collection/index creation when safely bounded.
- Developer/platform operations that drive delivery workflows: list/get projects, deployments/builds/runs, trigger deploy/run, cancel/rollback when supported, read logs/status, manage environment variables only when scoped and guarded.

## Exclude by Default

- Provider account billing and subscription endpoints.
- Admin/security policy endpoints.
- Audit logs unless requested.
- API key/token management endpoints.
- Internal metadata endpoints that do not feed automation.
- Pure dashboard/report endpoints that return charts rather than actionable records.
- Deprecated endpoints when a current alternative exists.
- Highly destructive bulk endpoints unless protected by clear required fields and the user asked for them.

## Coverage Target

For a broad SaaS connector, a good first pass is usually 12 to 35 nodes:

- 2 to 6 resource groups;
- each group gets list/search/get plus create/update when useful;
- comments/notes/messages and users/groups as supporting nodes;
- one webhook event node if supported.

Prefer complete useful coverage over raw endpoint count. Do not stop after only `get/list/create` if obvious workflow actions like comments, status changes, assignment, or restore are central to the product.

For narrow providers, fewer nodes can be correct only when the useful API surface is genuinely narrow. Examples:

- A chat-model provider may need chat, structured output when supported, embeddings if available, files/batches if they drive workflows, and model listing.
- A scraper may need scrape, crawl start/status/results, map/search, structured extraction, and batch operations if documented.
- A vector database may need collection/index list/create/get/delete, point/vector upsert/query/fetch/delete, scroll/list, and stats.

When time is limited, prefer fewer connectors with complete useful coverage over many connectors with only a minimal subset.
