---
name: kinn-connector-creator
description: 'Create or extend Kinn/Homeport workflow builder connectors in API/src/plugins/repos. Use when asked in French or English to add a connector, integration, provider, plugin, API app, actions, triggers, or endpoints in Kinn. Enforces the Notion-style connector structure: manifest.json plus one handler file per action, shared utils.js, useful workflow-only endpoints, complete output schemas, and validation.'
---

# Kinn Connector Creator

Use this skill when the user asks things like:

- "Ajoute le connecteur HubSpot dans Kinn"
- "Crée l'intégration Linear"
- "Add a connector for X"
- "Ajoute les endpoints utiles de X au workflow builder"

The target is always a workflow-builder connector under:

```text
API/src/plugins/repos/{connector}/
├── manifest.json
└── functions/
    ├── utils.js
    ├── {connector}-{resource}-{action}.js
    └── ...
```

Prefer the Notion connector style, not the GitLab monolithic style:

- one handler file per action;
- one shared `functions/utils.js`;
- manifest ordered as `repo`, `variables`, `providers`, `nodeTemplates`;
- every payload output references a `$var:` schema;
- every non-event `nodeTemplate.key` has a matching JS handler export.

## Required Workflow

1. Inspect existing connector conventions before editing:
   - `API/src/plugins/repos/notion/manifest.json`
   - `API/src/plugins/repos/notion/functions/utils.js`
   - several Notion action files
   - a broad connector like `gitlab` only to understand endpoint coverage and resource grouping.
2. Research the target API from official/current docs when endpoint details are not already provided. Keep source notes in your reasoning, but do not paste large docs into the repo.
3. Select only endpoints that are useful in workflow automation. Do not mirror the entire public API.
4. Create or update `API/src/plugins/repos/{connector}` using the Notion-style file layout.
5. Implement `manifest.json`, `functions/utils.js`, and one handler file per action.
6. Run the validation script bundled with this skill:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

7. Run any relevant project tests or import checks available locally. If none exist, state that validation was limited to static checks.

## What Counts as Useful

Include nodes that a workflow builder user can combine with other steps:

- list/search/get records;
- create/update/delete/archive/restore records;
- send messages, comments, notes, emails, notifications;
- upload/download/list files when file handling is supported;
- trigger/webhook event nodes when the API supports incoming events;
- relationship actions that unlock automation, such as assigning, linking, moving, tagging, changing status.

Usually exclude:

- admin-only settings and org governance;
- billing, invoices for the SaaS account itself, plan management;
- analytics dashboards that are only human reporting unless they produce workflow data;
- duplicate aliases around the same behavior;
- low-level endpoints that require too much provider-specific context to be useful as a generic node;
- destructive bulk operations unless there is a clear workflow use case and guarded inputs.

Read [references/endpoint-selection.md](references/endpoint-selection.md) for the selection rubric.

## Implementation Rules

- Use French UI text with accents in `title`, `subtitle`, `label`, `description`, group names, and credential titles.
- Use `snake_case` keys prefixed by provider: `{provider}_{resource}_{action}`.
- Use `camelCase` `name`.
- Use `schemaVersion: 2`.
- Use `type: "function"` and `nodeKind: "function"` for actions.
- Use `type: "event"` and `nodeKind: "event"` for incoming webhook triggers.
- Use `authorize_catch_error: true` for API actions unless the connector already consistently uses `authorize_skip_error`.
- Keep handler returns stable and small; map API responses into predictable fields instead of returning huge raw objects by default.
- Include pagination inputs on list/search nodes: usually `pageSize`/`per_page`, cursor/page when supported.
- For JSON-heavy provider features, use `json` or `textarea` args and validate JSON in the handler with clear errors.
- Never access `node.args`; use `inputs`.
- Credentials live in `opts.credentials`.
- Progress logs use `opts.log`, with short French messages.

## References

Load only what you need:

- [references/structure.md](references/structure.md): exact directory and file conventions.
- [references/endpoint-selection.md](references/endpoint-selection.md): how to decide which endpoints to keep.
- [references/manifest-patterns.md](references/manifest-patterns.md): manifest, provider, variable, and node template patterns.
- [references/handler-patterns.md](references/handler-patterns.md): `utils.js` and per-action handler patterns.
- [references/validation.md](references/validation.md): checks before handing off the connector.

