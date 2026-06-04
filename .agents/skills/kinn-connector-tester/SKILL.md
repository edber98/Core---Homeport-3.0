---
name: kinn-connector-tester
description: 'Test and validate Kinn/Homeport workflow-builder connectors under API/src/plugins/repos. Use when asked in French or English to test, verify, validate, smoke-test, audit, or check whether a connector respects all structural and UX constraints such as explicit request fields, French titles, clear subtitles, and non-technical descriptions.'
---

# Kinn Connector Tester

Use this skill to validate a connector without making real provider API calls by default.

Target connectors live in:

```text
API/src/plugins/repos/{connector}/
├── manifest.json
└── functions/
```

## Default Workflow

1. Inspect the requested connector name and normalize it to the folder name under `API/src/plugins/repos`.
2. Run the bundled static test script:

```bash
node .agents/skills/kinn-connector-tester/scripts/test-connector.js {connector}
```

3. If the user asks to test every function, or if static checks pass and deeper confidence is useful, run mock invocation:

```bash
node .agents/skills/kinn-connector-tester/scripts/test-connector.js {connector} --invoke
```

4. If failures mention the creator validator, also run:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

5. Fix connector issues only if the user asked for fixes. If the user only asked to test, report findings and avoid edits.

## What The Script Checks

- `manifest.json` parses.
- `repo`, `providers`, `variables`, and `nodeTemplates` are structurally coherent.
- `schemaVersion` is `2`.
- `nodeTemplate.key` is `snake_case`.
- `nodeTemplate.name` is `camelCase`.
- `providerKey` references an existing provider.
- Payload output handles reference declared `$var:` schemas.
- Les noeuds métier ne doivent pas exposer de champs génériques comme `body`, `payload`, `payloadJson`, `data`, `attributes`, `input`, `query`, `headers` ou `options`; seuls les noeuds `custom request` peuvent rester génériques.
- Les champs UX exposés dans les noeuds doivent être corrects: `title`, `subtitle`, `description` et `args.title` doivent être renseignés, en français clair, sans suffixe artificiel, sans symbole structurel parasite, et sans copier la clé technique.
- Every non-event node has a matching handler export.
- Handler files can be loaded with `require()`.
- Handlers do not use `node.args`.
- Optional `--invoke` calls every non-event handler using generated sample inputs, generated credentials, and mocked `fetch`.

For detailed levels, read [references/test-levels.md](references/test-levels.md).

## Running All Connectors

Use this for broad regression checks:

```bash
node .agents/skills/kinn-connector-tester/scripts/test-connector.js --all
```

Use `--json` when a machine-readable report is useful:

```bash
node .agents/skills/kinn-connector-tester/scripts/test-connector.js {connector} --invoke --json
```

## Real Provider Smoke Tests

Do not run real network calls by default. Only run live tests when the user explicitly asks and test credentials are available.

When live testing:

- Prefer safe read-only functions: status, get current user, list, search, get.
- Avoid create/update/delete/send/payment actions unless the user explicitly names them and provides disposable test resources.
- State exactly which functions were executed live.

## Reporting

Lead with failures. Include:

Quand une erreur de champ générique est détectée, le rapport doit citer le noeud fautif et indiquer que la requête doit être découpée en champs explicites alignés sur les attributs réellement documentés par l endpoint.
Le rapport doit aussi préciser qu un renommage cosmétique du champ générique vers `payloadJson`, `inputJson`, `queryJson`, `headersJson` ou équivalent n est pas une correction valide.
Quand un problème éditorial est détecté, le rapport doit citer le noeud fautif et préciser si l erreur concerne un titre non français, un suffixe artificiel, un symbole parasite, une description trop technique, ou un `args.title` incohérent.

- connector name;
- command(s) run;
- pass/fail summary;
- warnings;
- specific missing handlers, schema problems, load errors, or invocation errors;
- whether tests were static, mock invocation, or live.

If no issues are found, say that the connector passed the tested level and mention any remaining gap, such as no live provider credentials.
