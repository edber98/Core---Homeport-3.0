# Handler Patterns

## `functions/utils.js`

Own all repeated API behavior in `utils.js`: credentials, base URL, query string, headers, JSON parsing, error normalization, pagination helpers.

```js
async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Clé API Provider manquante." };

  const baseUrl = String(credentials.baseUrl || "https://api.provider.com").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    return {
      ok: false,
      error: data?.message || data?.error || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

module.exports = { utils: { providerRequest } };
```

## Action Handler

```js
const { utils } = require("./utils");

module.exports = {
  async provider_item_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = String(d.name || "").trim();
    if (!name) return { ok: false, error: "Nom requis." };

    const body = { name };
    if (d.description) body.description = d.description;

    log("Création en cours...");
    const res = await utils.providerRequest(opts, "/items", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id,
      name: r.name,
      url: r.url,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  }
};
```

## List Handler

```js
const { utils } = require("./utils");

module.exports = {
  async provider_items_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {
      search: d.search,
      page_size: parseInt(d.pageSize, 10) || 50,
      cursor: d.cursor
    };

    log("Recherche en cours...");
    const res = await utils.providerRequest(opts, "/items", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const rawItems = Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
    const items = rawItems.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    return {
      ok: true,
      items,
      totalCount: Number(res.data?.total || items.length),
      nextCursor: res.data?.next_cursor || null
    };
  }
};
```

## JSON Args

When accepting JSON, allow both already-compiled objects and strings:

```js
function parseJsonInput(value, label) {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}
```

Return `{ ok: false, error }` for validation failures that users can fix. Throw only for unexpected failures or when local code is broken.

