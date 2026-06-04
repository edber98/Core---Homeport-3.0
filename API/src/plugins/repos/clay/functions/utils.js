function credentials(opts) {
  const c = (opts && opts.credentials) || {};
  return { apiKey: c.apiKey || c.token || "", baseUrl: String(c.baseUrl || "https://api.clay.com").replace(/\/+$/, ""), login: c.login || "", secretKey: c.secretKey || "", revision: c.revision || "2026-01-15" };
}

function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error("JSON invalide dans " + label + "."); }
}

function compactJson(value) {
  if (value === undefined || value === null) return "";
  try { return JSON.stringify(value); } catch { return String(value); }
}

function interpolate(path, d) {
  return path.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => {
    const value = d[key];
    if (value === undefined || value === null || value === "") throw new Error("Champ requis manquant: " + key + ".");
    return encodeURIComponent(String(value));
  });
}

function pick(d, keys) {
  const out = {};
  for (const key of keys || []) if (d[key] !== undefined && d[key] !== null && d[key] !== "") out[key] = d[key];
  return out;
}

function buildObjectFromFields(rows) {
  const object = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row && row.fieldKey || '').trim();
    if (!key) continue;
    let value = row.fieldValue;
    switch (row.fieldType || 'string') {
      case 'number': value = Number(value); if (Number.isNaN(value)) throw new Error(`Nombre invalide pour ${key}.`); break;
      case 'boolean': value = value === true || String(value).toLowerCase() === 'true'; break;
      case 'json': value = parseJsonInput(value, key, null); break;
      case 'null': value = null; break;
      default: value = value == null ? '' : String(value);
    }
    object[key] = value;
  }
  return object;
}

function bodyFrom(d, keys, jsonKeys) {
  const out = buildObjectFromFields(d.requestFields);
  for (const key of keys || []) if (d[key] !== undefined && d[key] !== null && d[key] !== "") out[key] = d[key];
  for (const key of jsonKeys || []) if (d[key] !== undefined && d[key] !== null && d[key] !== "") out[key] = parseJsonInput(d[key], key, undefined);
  return Object.keys(out).length ? out : undefined;
}

async function apiRequest(opts, requestPath, options = {}) {
  const c = credentials(opts);
  const isWebhook = requestPath.startsWith("http");
  if (!isWebhook && !c.apiKey) return { ok: false, error: "Clé API manquante." };
  const url = new URL(requestPath.startsWith("http") ? requestPath : c.baseUrl + requestPath);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (Array.isArray(value)) for (const item of value) if (item !== undefined && item !== null && item !== "") url.searchParams.append(key, String(item));
    else if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers = { "Content-Type": "application/json", ...{} };
  if ("bearer" === "bearer" && c.apiKey) headers.Authorization = "Bearer " + c.apiKey;
  if ("bearer" === "x-api-key") headers["X-Api-Key"] = c.apiKey;
  if ("bearer" === "klaviyo") { headers.Authorization = "Klaviyo-API-Key " + c.apiKey; headers.revision = c.revision; headers.Accept = "application/vnd.api+json"; headers["Content-Type"] = "application/vnd.api+json"; }
  if ("bearer" === "qonto") headers.Authorization = c.login + ":" + c.secretKey;
  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body: options.body ? JSON.stringify(options.body) : undefined });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) return { ok: false, status: res.status, error: data?.message || data?.error?.message || data?.error || data?.errors?.[0]?.detail || text || "HTTP " + res.status, details: data };
  return { ok: true, status: res.status, data };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.people)) return value.people;
  if (Array.isArray(value?.contacts)) return value.contacts;
  if (Array.isArray(value?.accounts)) return value.accounts;
  if (Array.isArray(value?.transactions)) return value.transactions;
  if (Array.isArray(value?.bank_accounts)) return value.bank_accounts;
  if (Array.isArray(value?.videos)) return value.videos;
  if (Array.isArray(value?.folders)) return value.folders;
  return [];
}

function itemFromUnknown(value, index = 0) {
  const r = value || {};
  const a = r.attributes || {};
  const p = r.properties || {};
  return {
    id: String(r.id || r.uuid || r.key || r.uid || r.slug || r.email || a.id || a.email || index),
    name: r.name || r.title || r.label || r.email || a.name || a.title || a.email || p.name || "",
    status: r.status || r.state || r.type || a.status || a.state || "",
    url: r.url || r.html_url || r.web_url || r.share_url || r.download_url || a.url || "",
    text: r.text || r.description || r.summary || a.text || a.description || "",
    result_json: compactJson(r)
  };
}

function responseResult(data) {
  const item = itemFromUnknown(data && data.data && !Array.isArray(data.data) ? data.data : data, 0);
  return { ok: true, ...item, data, result_json: compactJson(data) };
}

function listResult(data) {
  const items = asArray(data).map(itemFromUnknown);
  return { ok: true, items, totalCount: Number(data?.pagination?.total_entries || data?.total || data?.total_count || data?.count || items.length), nextCursor: data?.next_cursor || data?.pagination?.next || data?.links?.next || "", data, result_json: compactJson(data) };
}

const ACTIONS = {
  "clay_webhook_send": {
    "path": "{webhookUrl}",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [
      "payload"
    ],
    "list": false
  },
  "clay_people_search": {
    "path": "/v1/people/search",
    "method": "POST",
    "query": [],
    "body": [
      "query",
      "email",
      "domain"
    ],
    "json": [],
    "list": true
  },
  "clay_person_enrich": {
    "path": "/v1/people/enrich",
    "method": "POST",
    "query": [],
    "body": [
      "email",
      "linkedin_url",
      "domain"
    ],
    "json": [],
    "list": false
  },
  "clay_companies_search": {
    "path": "/v1/companies/search",
    "method": "POST",
    "query": [],
    "body": [
      "query",
      "domain"
    ],
    "json": [],
    "list": true
  },
  "clay_company_enrich": {
    "path": "/v1/companies/enrich",
    "method": "POST",
    "query": [],
    "body": [
      "domain",
      "name"
    ],
    "json": [],
    "list": false
  },
  "clay_table_row_create": {
    "path": "/v1/tables/{tableId}/rows",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "clay_table_rows_list": {
    "path": "/v1/tables/{tableId}/rows",
    "method": "GET",
    "query": [
      "limit",
      "cursor"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "clay_table_row_get": {
    "path": "/v1/tables/{tableId}/rows/{rowId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "clay_table_row_update": {
    "path": "/v1/tables/{tableId}/rows/{rowId}",
    "method": "PATCH",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "clay_table_row_delete": {
    "path": "/v1/tables/{tableId}/rows/{rowId}",
    "method": "DELETE",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "clay_api_request": {
    "path": "{path}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  }
};

async function run(key, inputs, opts) {
  const spec = ACTIONS[key];
  if (!spec) return { ok: false, error: "Action inconnue: " + key };
  const log = opts && opts.log ? opts.log : () => {};
  try {
    if (key === "clay_api_request") {
      const method = String((inputs || {}).method || "GET").toUpperCase();
      const path = String((inputs || {}).path || "").trim();
      if (!path) return { ok: false, error: "Champ requis manquant: path." };
      const query = buildObjectFromFields((inputs || {}).queryFields);
      const body = method === "GET" || method === "DELETE" ? undefined : buildObjectFromFields((inputs || {}).requestFields);
      const res = await apiRequest(opts, path, { method, query, body });
      if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
      return responseResult(res.data);
    }
    const path = interpolate(spec.path, inputs || {});
    const query = pick(inputs || {}, spec.query || []);
    const body = spec.method === "GET" ? undefined : bodyFrom(inputs || {}, spec.body || [], spec.json || []);
    log(spec.log || "Requête en cours...");
    const res = await apiRequest(opts, path, { method: spec.method || "GET", query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return spec.list ? listResult(res.data) : responseResult(res.data);
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, apiRequest, parseJsonInput, compactJson, responseResult, listResult, buildObjectFromFields } };
