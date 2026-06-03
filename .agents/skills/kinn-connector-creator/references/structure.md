# Structure

## Preferred Connector Layout

Create connectors under `API/src/plugins/repos/{connector}`:

```text
{connector}/
├── manifest.json
└── functions/
    ├── utils.js
    ├── {connector}-{resource}-{action}.js
    ├── {connector}-{resource}-get.js
    ├── {connector}-{resource}-list.js
    └── {connector}-webhook-event.js   # only when a dedicated handler is needed
```

Use Notion as the local model:

- `manifest.json` contains all UI/provider/template/schema declarations.
- `functions/utils.js` owns auth, base URL, request construction, parsing, and normalized errors.
- each action file exports one object with one function whose name matches the template key.

Example handler file:

```js
const { utils } = require("./utils");

module.exports = {
  async provider_resource_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const id = String(d.id || "").trim();
    if (!id) return { ok: false, error: "ID requis." };

    log("Récupération des données...");
    const res = await utils.providerRequest(opts, `/resources/${encodeURIComponent(id)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: res.data.id, name: res.data.name, url: res.data.url };
  }
};
```

## Why Not the GitLab Style

GitLab keeps many handlers in `functions/gitlab.js`. That is supported by the registry, but new connectors should not copy that shape. A monolithic handler file makes diffs and maintenance harder as the connector grows. Use GitLab mainly as a reference for resource coverage and API helper ideas, not for file structure.

## Naming

- Folder: lower-case kebab or snake style, preferably the provider key, e.g. `notion`, `google-drive`, `gitlab`.
- Provider key: `snake_case`, globally unique.
- Template key: `{provider}_{resource}_{action}`, e.g. `hubspot_contact_create`.
- File name: kebab form of the key, e.g. `hubspot-contact-create.js`.
- Function export: exact template key, e.g. `async hubspot_contact_create(...)`.
- Variable schema names: `{provider}_{resource}` or `{provider}_{resources}`.

## Events

For webhook/event nodes, add a manifest `nodeTemplate` with `type: "event"`. A dedicated JS handler is optional only if the platform trigger adapter handles the event generically. If you add an event without a handler, document that it is handled by the generic webhook trigger path and verify `API/src/services/triggers/adapter-registry.js` covers it or falls back to `_webhook_event`.

