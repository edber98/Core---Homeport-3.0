---
name: kinn-connector-tester
description: 'Test and validate Kinn/Homeport workflow-builder connectors under API/src/plugins/repos. Use when asked in French or English to test, verify, validate, smoke-test, audit, or check a connector such as "teste le connecteur notion", "vérifie le connecteur Home Assistant", "run connector tests", or "test all connector functions".'
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
- Les noeuds ne doivent pas exposer un unique champ générique `body`/`payload`/`payloadJson`/`data`/`attributes`; les attributs du body doivent être modélisés comme champs distincts.
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

Quand une erreur de granularité body est détectée, le rapport doit citer le noeud fautif et indiquer que le body doit être découpé en champs explicites par attribut accepté par l endpoint.
Le rapport doit aussi préciser qu un renommage cosmétique du champ générique vers `payloadJson` ou équivalent n est pas une correction valide.


- connector name;
- command(s) run;
- pass/fail summary;
- warnings;
- specific missing handlers, schema problems, load errors, or invocation errors;
- whether tests were static, mock invocation, or live.

If no issues are found, say that the connector passed the tested level and mention any remaining gap, such as no live provider credentials.
