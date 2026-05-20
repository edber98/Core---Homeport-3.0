function credentials(opts) {
  const c = (opts && opts.credentials) || {};
  return { apiKey: c.apiKey || c.token || "", baseUrl: String(c.baseUrl || "https://thirdparty.qonto.com/v2").replace(/\/+$/, ""), login: c.login || "", secretKey: c.secretKey || "", revision: c.revision || "2026-01-15" };
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

function bodyFrom(d, keys, jsonKeys) {
  const payload = parseJsonInput(d.payload, "payload", undefined);
  const out = payload && typeof payload === "object" && !Array.isArray(payload) ? { ...payload } : {};
  for (const key of keys || []) if (d[key] !== undefined && d[key] !== null && d[key] !== "") out[key] = d[key];
  for (const key of jsonKeys || []) if (d[key] !== undefined && d[key] !== null && d[key] !== "") out[key] = parseJsonInput(d[key], key, undefined);
  return Object.keys(out).length ? out : undefined;
}

async function apiRequest(opts, requestPath, options = {}) {
  const c = credentials(opts);
  if ((!c.login || !c.secretKey)) return { ok: false, error: "Login et clé secrète requis." };
  const url = new URL(requestPath.startsWith("http") ? requestPath : c.baseUrl + requestPath);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (Array.isArray(value)) for (const item of value) if (item !== undefined && item !== null && item !== "") url.searchParams.append(key, String(item));
    else if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers = { "Content-Type": "application/json", ...{} };
  if ("qonto" === "bearer") headers.Authorization = "Bearer " + c.apiKey;
  if ("qonto" === "x-api-key") headers["X-Api-Key"] = c.apiKey;
  if ("qonto" === "klaviyo") { headers.Authorization = "Klaviyo-API-Key " + c.apiKey; headers.revision = c.revision; headers.Accept = "application/vnd.api+json"; headers["Content-Type"] = "application/vnd.api+json"; }
  if ("qonto" === "qonto") headers.Authorization = c.login + ":" + c.secretKey;
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
  "qonto_organization_get": {
    "path": "/organization",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "qonto_bank_accounts_list": {
    "path": "/bank_accounts",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": true
  },
  "qonto_transactions_list": {
    "path": "/transactions",
    "method": "GET",
    "query": [
      "slug",
      "iban",
      "status",
      "updated_at_from",
      "updated_at_to",
      "current_page",
      "per_page"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "qonto_transaction_get": {
    "path": "/transactions/{transactionId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "qonto_transaction_attachment_upload": {
    "path": "/transactions/{transactionId}/attachments",
    "method": "POST",
    "query": [],
    "body": [
      "fileUrl",
      "fileName"
    ],
    "json": [],
    "list": false
  },
  "qonto_sepa_transfer_create": {
    "path": "/sepa/transfers",
    "method": "POST",
    "query": [],
    "body": [
      "slug",
      "iban",
      "beneficiary_id",
      "amount",
      "currency",
      "reference"
    ],
    "json": [],
    "list": false
  },
  "qonto_beneficiaries_list": {
    "path": "/beneficiaries",
    "method": "GET",
    "query": [
      "slug",
      "current_page",
      "per_page"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "qonto_beneficiary_create": {
    "path": "/beneficiaries",
    "method": "POST",
    "query": [],
    "body": [
      "name",
      "iban",
      "bic"
    ],
    "json": [],
    "list": false
  },
  "qonto_memberships_list": {
    "path": "/memberships",
    "method": "GET",
    "query": [
      "slug",
      "current_page",
      "per_page"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "qonto_labels_list": {
    "path": "/labels",
    "method": "GET",
    "query": [
      "slug"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "qonto_client_create": {
    "path": "/clients",
    "method": "POST",
    "query": [],
    "body": [
      "name",
      "email",
      "vat_number"
    ],
    "json": [],
    "list": false
  },
  "qonto_invoices_list": {
    "path": "/client_invoices",
    "method": "GET",
    "query": [
      "slug",
      "status",
      "current_page",
      "per_page"
    ],
    "body": [],
    "json": [],
    "list": true
  }
};

async function run(key, inputs, opts) {
  const spec = ACTIONS[key];
  if (!spec) return { ok: false, error: "Action inconnue: " + key };
  const log = opts && opts.log ? opts.log : () => {};
  try {
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

module.exports = { utils: { run, apiRequest, parseJsonInput, compactJson, responseResult, listResult } };
