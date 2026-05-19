# Connector Test Levels

Use the smallest level that answers the user's request.

## Level 1: Static

Run the bundled script without `--invoke`.

Checks:
- manifest JSON parses;
- provider and template keys are present;
- schemaVersion is 2;
- providerKey references an existing provider;
- payload outputs reference declared `$var:` schemas;
- handler exports exist for non-event templates;
- handlers can be `require()` loaded;
- handler files do not use `node.args`.

This is the default for "vérifie le connecteur" or "teste le connecteur rapidement".

## Level 2: Mock Invocation

Run the bundled script with `--invoke`.

Checks Level 1, then invokes each non-event handler with generated sample inputs, generated credentials, and a mocked `fetch`.

Use this when the user asks to test every function without using real provider credentials. Treat failures as actionable smoke-test failures, but inspect false positives when a connector needs highly provider-specific fixtures.

## Level 3: Real Smoke Tests

Only run real network calls when the user explicitly asks and credentials/environment are available.

Rules:
- default to safe read-only functions such as status, get me, list, search;
- do not run create/update/delete/send/payment actions unless the user explicitly names them and provides test resources;
- never use production resources for destructive tests;
- summarize exactly which functions were executed live.
