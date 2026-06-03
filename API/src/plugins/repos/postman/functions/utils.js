function credentials(opts) {
  const c = (opts && opts.credentials) || {};
  const apiKey = String(c.apiKey || "").trim();
  if (!apiKey) return { ok: false, error: "Clé API Postman requise." };
  const baseUrl = String(c.baseUrl || "https://api.getpostman.com").replace(/\/+$/, "");
  return { ok: true, apiKey, baseUrl };
}

async function postmanRequest(opts, path, options = {}) {
  const auth = credentials(opts);
  if (!auth.ok) return auth;

  const url = new URL(`${auth.baseUrl}${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      "X-API-Key": auth.apiKey,
      "Content-Type": "application/json"
    }
  };
  if (options.body !== undefined) fetchOptions.body = JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text().catch(() => "");
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data?.error?.message || data?.message || data?.error || `Erreur Postman ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function compact(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}

function itemSummary(item) {
  return {
    id: item?.id || item?.uid,
    uid: item?.uid,
    name: item?.name,
    type: item?.type,
    visibility: item?.visibility,
    owner: item?.owner,
    updatedAt: item?.updatedAt || item?.updated_at,
    raw: item
  };
}

function listResult(data, key) {
  const items = Array.isArray(data?.[key]) ? data[key].map(itemSummary) : [];
  return { ok: true, totalCount: items.length, items, raw: data };
}

function resourceResult(data, key) {
  const resource = data?.[key] || data || {};
  return {
    ok: true,
    id: resource.id || resource.uid,
    uid: resource.uid,
    name: resource.name,
    type: resource.type,
    visibility: resource.visibility,
    raw: data
  };
}

function operationResult(data) {
  return {
    ok: true,
    id: data?.id || data?.uid,
    uid: data?.uid,
    name: data?.name,
    message: data?.message,
    raw: data
  };
}

module.exports = {
  utils: {
    postmanRequest,
    parseJson,
    compact,
    listResult,
    resourceResult,
    operationResult
  }
};
