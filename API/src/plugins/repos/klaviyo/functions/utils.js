function credentials(opts) {
  const c = (opts && opts.credentials) || {};
  return { apiKey: c.apiKey || c.token || "", baseUrl: String(c.baseUrl || "https://a.klaviyo.com/api").replace(/\/+$/, ""), login: c.login || "", secretKey: c.secretKey || "", revision: c.revision || "2026-01-15" };
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

function klaviyoBody(key, d, fallback) {
  if (d.payload) return fallback;
  if (key === "klaviyo_profile_create" || key === "klaviyo_profile_update") {
    const attributes = {};
    if (d.email) attributes.email = d.email;
    if (d.phone_number) attributes.phone_number = d.phone_number;
    if (d.properties) attributes.properties = parseJsonInput(d.properties, "properties", {});
    return { data: { type: "profile", ...(d.profileId ? { id: d.profileId } : {}), attributes } };
  }
  if (key === "klaviyo_event_create") {
    const attributes = {
      properties: parseJsonInput(d.properties, "properties", {}),
      metric: { data: { type: "metric", attributes: { name: d.metricName } } }
    };
    if (d.email) attributes.profile = { data: { type: "profile", attributes: { email: d.email } } };
    return { data: { type: "event", attributes } };
  }
  if (key === "klaviyo_campaign_create") {
    return { data: { type: "campaign", attributes: { name: d.name, channel: d.channel || "email" } } };
  }
  if (key === "klaviyo_campaign_send") {
    return {
      data: {
        type: "campaign-send-job",
        relationships: { campaign: { data: { type: "campaign", id: d.campaignId } } }
      }
    };
  }
  if ((key === "klaviyo_list_profiles_add" || key === "klaviyo_list_profiles_remove") && d.data) {
    return { data: parseJsonInput(d.data, "data", []) };
  }
  return fallback;
}

async function apiRequest(opts, requestPath, options = {}) {
  const c = credentials(opts);
  if (!c.apiKey) return { ok: false, error: "Clé API manquante." };
  const url = new URL(requestPath.startsWith("http") ? requestPath : c.baseUrl + requestPath);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (Array.isArray(value)) for (const item of value) if (item !== undefined && item !== null && item !== "") url.searchParams.append(key, String(item));
    else if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers = { "Content-Type": "application/json", ...{} };
  if ("klaviyo" === "bearer") headers.Authorization = "Bearer " + c.apiKey;
  if ("klaviyo" === "x-api-key") headers["X-Api-Key"] = c.apiKey;
  if ("klaviyo" === "klaviyo") { headers.Authorization = "Klaviyo-API-Key " + c.apiKey; headers.revision = c.revision; headers.Accept = "application/vnd.api+json"; headers["Content-Type"] = "application/vnd.api+json"; }
  if ("klaviyo" === "qonto") headers.Authorization = c.login + ":" + c.secretKey;
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
  "klaviyo_profiles_list": {
    "path": "/profiles",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_profile_get": {
    "path": "/profiles/{profileId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "klaviyo_profile_create": {
    "path": "/profiles",
    "method": "POST",
    "query": [],
    "body": [
      "email",
      "phone_number"
    ],
    "json": [
      "properties"
    ],
    "list": false
  },
  "klaviyo_profile_update": {
    "path": "/profiles/{profileId}",
    "method": "PATCH",
    "query": [],
    "body": [
      "email"
    ],
    "json": [
      "properties"
    ],
    "list": false
  },
  "klaviyo_profile_delete": {
    "path": "/profiles/{profileId}",
    "method": "DELETE",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "klaviyo_event_create": {
    "path": "/events",
    "method": "POST",
    "query": [],
    "body": [
      "metricName",
      "email"
    ],
    "json": [
      "properties"
    ],
    "list": false
  },
  "klaviyo_events_list": {
    "path": "/events",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_metrics_list": {
    "path": "/metrics",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_lists_list": {
    "path": "/lists",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_list_get": {
    "path": "/lists/{listId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "klaviyo_list_profiles_add": {
    "path": "/lists/{listId}/relationships/profiles",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [
      "data"
    ],
    "list": false
  },
  "klaviyo_list_profiles_remove": {
    "path": "/lists/{listId}/relationships/profiles",
    "method": "DELETE",
    "query": [],
    "body": [],
    "json": [
      "data"
    ],
    "list": false
  },
  "klaviyo_segments_list": {
    "path": "/segments",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_segment_get": {
    "path": "/segments/{segmentId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "klaviyo_campaigns_list": {
    "path": "/campaigns",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_campaign_get": {
    "path": "/campaigns/{campaignId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "klaviyo_campaign_create": {
    "path": "/campaigns",
    "method": "POST",
    "query": [],
    "body": [
      "name",
      "channel"
    ],
    "json": [],
    "list": false
  },
  "klaviyo_campaign_send": {
    "path": "/campaign-send-jobs",
    "method": "POST",
    "query": [],
    "body": [
      "campaignId"
    ],
    "json": [],
    "list": false
  },
  "klaviyo_flows_list": {
    "path": "/flows",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_flow_get": {
    "path": "/flows/{flowId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "klaviyo_templates_list": {
    "path": "/templates",
    "method": "GET",
    "query": [
      "filter",
      "page[size]",
      "page[cursor]"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "klaviyo_template_get": {
    "path": "/templates/{templateId}",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "klaviyo_metric_get": {
    "path": "/metrics/{metricId}",
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
    const path = interpolate(spec.path, inputs || {});
    const query = pick(inputs || {}, spec.query || []);
    const body = spec.method === "GET" ? undefined : klaviyoBody(key, inputs || {}, bodyFrom(inputs || {}, spec.body || [], spec.json || []));
    log(spec.log || "Requête en cours...");
    const res = await apiRequest(opts, path, { method: spec.method || "GET", query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return spec.list ? listResult(res.data) : responseResult(res.data);
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, apiRequest, parseJsonInput, compactJson, responseResult, listResult } };
