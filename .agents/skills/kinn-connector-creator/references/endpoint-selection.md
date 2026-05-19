# Endpoint Selection

The goal is not to expose every API endpoint. The goal is to create useful workflow builder nodes.

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
3. Add event/webhook triggers if they unlock automation starts.
4. Add file operations only if they integrate with Homeport file helpers or return stable URLs/metadata.
5. Keep advanced/rare endpoints out unless the user explicitly asks.

## Include

- CRUD for central business objects.
- Search/list nodes with filters and pagination.
- Communication actions: send message, create comment, add note.
- Workflow state changes: close issue, move task, update status, assign user.
- Webhook events with a generic payload schema.
- User/team lookup when needed to drive assignment and filtering.

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

