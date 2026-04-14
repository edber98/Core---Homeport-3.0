# Plugin manifest schema — risk classification

This note documents the `risk` / `riskReason` fields on `manifest.nodeTemplates[]`.
Every plugin function is annotated with a `risk` level so that the AI assistant
and the runtime permission layer can decide whether confirmation / guardrails
are required before executing it.

## Levels

| Risk          | Meaning                                                                                          | Rollback  | Example verbs                                                     |
|---------------|--------------------------------------------------------------------------------------------------|-----------|-------------------------------------------------------------------|
| `safe`        | Read-only, no observable external side effect.                                                   | n/a       | get, list, read, search, fetch, find, download, count, check, preview, export |
| `write`       | Modifies reversible state (can be undone or edited).                                             | easy      | create, update, upload, post, patch, send, add, assign, tag, publish, import, convert, render, generate |
| `destructive` | Alters/deletes without easy rollback or produces a legally/financially engaging artifact.        | hard/none | delete, remove, destroy, cancel, revoke, deactivate, archive, purge, clear, reset, replace, overwrite, truncate; also invoice finalize/validate/post, payment capture/refund |
| `elevated`    | Broad power — executes arbitrary code/query, triggers long running jobs, has budget implications.| n/a       | execute, run, eval, trigger, deploy, sync, crawl, scan_all, bulk, agent, http (arbitrary URL) |

## Field location

On each entry of `manifest.nodeTemplates[]`:

```json
{
  "key": "slack_delete_message",
  "name": "slackDeleteMessage",
  "title": "Supprimer un message",
  "type": "function",
  "risk": "destructive",
  "riskReason": "Supprime un message (pas de rollback)"
}
```

- `risk` (string, optional but strongly recommended) — one of `safe`, `write`,
  `destructive`, `elevated`. **If absent, the importer defaults to `write`** as
  the safest assumption for side-effectful operations.
- `riskReason` (string, optional) — short French sentence explaining *why*
  this level was chosen. Shown to end users in confirmation dialogs.

## Propagation to NodeTemplate

`API/src/plugins/importer.js` reads these two fields and writes them into the
`NodeTemplate` Mongo document:

- `NodeTemplate.risk` — mirrored top-level for fast querying / indexing.
- `NodeTemplate.riskReason`
- `NodeTemplate.metadata.risk` and `metadata.riskReason` — also stored in the
  metadata bag so downstream consumers that only read `metadata` still see them.

The `checksumFeature` now includes `risk`, which means changing the risk level
of a function triggers a structural change detection for existing flows (same
behaviour as changing inputHandles / outputHandles).

## Usage by the AI assistant

The assistant reads `NodeTemplate.risk` when:

- Running a flow in `prudent` autonomy mode — confirms before any `write` or
  higher.
- Running in `balanced` mode — auto-confirms `write`, prompts for
  `destructive`/`elevated`.
- Running in `autonomous` mode — only prompts for `elevated` or when the
  function explicitly sets `riskReason` with a sensitive marker (e.g.
  "mouvement bancaire", "document comptable engageant").

## Annotation scripts

Two utilities live under `API/scripts/`:

- `annotate-plugin-risks.js` — heuristic auto-tagger over keys/names/titles.
  Run with `--dry-run` to preview, `--apply` to write, `--force` to overwrite
  existing `risk` values.
- `apply-plugin-risk-overrides.js` — curated manual overrides for critical
  plugins (slack, odoo, stripe, github, etc.), run after the heuristic pass.

Regenerate the full annotation with:

```bash
node API/scripts/annotate-plugin-risks.js --apply
node API/scripts/apply-plugin-risk-overrides.js
```
