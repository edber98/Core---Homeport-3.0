# Pruning Rubric

## Keep

- Central objects users automate around: contacts, companies, deals, tickets, issues, projects, pages, tasks, files, messages, comments, users, groups.
- Actions that start or move a workflow: webhook events, create/update/status changes, assignment, tagging, linking, moving.
- Read operations required by later workflow steps: list/search/get.
- File operations when they return file refs, URLs, or metadata usable by another node.

## Remove by Default

- Provider account billing, subscription, plan, and payment method endpoints.
- Admin/security governance endpoints.
- API key/token management endpoints.
- Audit logs and compliance exports unless requested.
- Human dashboard/report-only endpoints.
- Deprecated endpoints when a current equivalent remains.
- Duplicate aliases that expose the same API call.
- Very low-level API internals that require provider-specific setup and are not generally composable.

## How to Remove Safely

1. Remove the `nodeTemplates[]` entries first.
2. Find matching handler files by converting keys to kebab filenames.
3. Remove only handler files that no remaining template uses.
4. Search `$var:name` references before deleting variables.
5. Run the connector checker and fix all errors.

