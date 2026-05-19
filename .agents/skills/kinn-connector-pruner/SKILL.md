---
name: kinn-connector-pruner
description: 'Prune or clean Kinn/Homeport connectors in API/src/plugins/repos by removing workflow-irrelevant endpoints, node templates, variables, and handler files. Use when asked to reduce, simplify, trim, remove endpoints from, or keep only useful automation actions for a Kinn connector.'
---

# Kinn Connector Pruner

Use this skill when the user asks to clean a connector, remove useless endpoints, reduce an integration, or keep only workflow-builder useful actions.

Target connectors live in:

```text
API/src/plugins/repos/{connector}/
```

## Workflow

1. Inspect `manifest.json`, `functions/`, and existing resource groups.
2. Classify every node as keep/remove using [references/pruning-rubric.md](references/pruning-rubric.md).
3. Remove the matching `nodeTemplates[]` entries.
4. Remove handler files that no remaining template uses.
5. Remove unused `variables` schemas.
6. Keep `providers[]`, credentials, `utils.js`, and shared helpers unless genuinely unused.
7. Validate with:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

If the creator skill is not available in the repo, manually verify template keys, handlers, and `$var:` schemas.

## Rules

- Do not remove central automation actions: list/search/get/create/update/delete/archive/restore, comments/notes/messages, assignment/status/tagging, file actions, and webhook events.
- Do remove admin-only, billing, dashboard-only, duplicated, deprecated, or overly niche endpoints unless the user explicitly wants them.
- Preserve user changes unrelated to the pruning request.
- After pruning, summarize kept groups and removed groups.

