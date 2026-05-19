# Validation

Run static validation after creating or editing a connector:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

Also run these manual checks:

1. `manifest.json` parses with `jq`.
2. `repo.name` matches the connector folder.
3. Provider credentials match what `functions/utils.js` reads.
4. Every `outputHandles[]` payload has `schema: "$var:..."`.
5. Every `$var:` reference exists in `variables`.
6. Every non-event `nodeTemplate.key` has a matching handler export in `functions/*.js`.
7. Every handler uses `inputs`, not `node.args`.
8. List/search handlers return arrays under the same key described by their schema.
9. Error returns include `{ ok: false, error, status?, details? }`.
10. UI labels and descriptions are in French with accents.

If a connector includes webhook/event nodes:

- verify `API/src/services/triggers/adapter-registry.js` has an exact entry or the key ends with `_webhook_event` for fallback behavior;
- define a payload schema for the event;
- include a `path` arg when the generic webhook trigger expects one.

If the project has an import/bootstrap test command, run it. Otherwise, state that only static validation was run.

