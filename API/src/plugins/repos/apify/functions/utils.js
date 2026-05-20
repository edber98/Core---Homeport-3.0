async function apifyRequest(opts, requestPath, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Clé API manquante." };
  if (false && !credentials.identifier) return { ok: false, error: "Identifiant Crisp manquant." };
  const baseUrl = String(credentials.baseUrl || "https://api.apify.com/v2").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "URL de base manquante." };
  const url = new URL(requestPath.startsWith("http") ? requestPath : `${baseUrl}${requestPath}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (Array.isArray(value)) {
        for (const item of value) if (item !== undefined && item !== null && item !== "") url.searchParams.append(key, String(item));
      } else if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  let body;
  if (options.rawBody !== undefined) body = options.rawBody;
  else if (options.body !== undefined) body = JSON.stringify(options.body);
  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const responseType = options.responseType || "json";
  if (responseType === "text") {
    const text = await res.text();
    if (!res.ok) return { ok: false, error: text || `HTTP ${res.status}`, status: res.status };
    return { ok: true, status: res.status, data: text, headers: res.headers };
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const message = data?.message || data?.error?.message || data?.error || data?.detail || `HTTP ${res.status}`;
    return { ok: false, error: message, status: res.status, details: data };
  }
  return { ok: true, status: res.status, data, headers: res.headers };
}

function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function compactJson(value) {
  if (value === undefined || value === null) return "";
  try { return JSON.stringify(value); } catch { return String(value); }
}

function getPath(value, path) {
  if (!path) return value;
  return String(path).split(".").reduce((acc, part) => acc && acc[part], value);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.objects)) return value.objects;
  return [];
}

function itemFromUnknown(value, index = 0) {
  const r = value || {};
  const attrs = r.attributes || {};
  const props = r.properties || {};
  return {
    id: String(r.id || r.key || r.uuid || r.uid || r.slug || r.name || attrs.slug || index),
    name: r.name || r.title || r.subject || r.email || attrs.title || attrs.name || props.name || "",
    status: r.status || r.state || r.type || attrs.status || "",
    url: r.url || r.html_url || r.web_url || r.shareUrl || r.link || attrs.url || "",
    text: r.text || r.message || r.description || attrs.message || attrs.description || "",
    result_json: compactJson(r)
  };
}

module.exports = { utils: { apifyRequest, parseJsonInput, compactJson, getPath, asArray, itemFromUnknown } };
