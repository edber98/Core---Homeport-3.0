function cleanBaseUrl(value, fallback) {
  return String(value || fallback).replace(/\/+$/, "");
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value).split(/[\n,]+/).map((v) => v.trim()).filter(Boolean);
}

function parseJsonInput(value, label) {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return undefined;
  return ["1", "true", "yes", "oui", "on"].includes(String(value).trim().toLowerCase());
}

async function cloudflareRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { apiToken, apiEmail, apiKey } = credentials;
  if (!apiToken && (!apiEmail || !apiKey)) {
    return { ok: false, error: "Jeton API Cloudflare ou couple email/clé API requis." };
  }

  const baseUrl = cleanBaseUrl(credentials.baseUrl, "https://api.cloudflare.com/client/v4");
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers = { ...(options.headers || {}) };
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  } else {
    headers["X-Auth-Email"] = apiEmail;
    headers["X-Auth-Key"] = apiKey;
  }
  if (!options.rawBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : (options.rawBody ? options.body : JSON.stringify(options.body))
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  if (options.rawText) {
    if (!res.ok) return { ok: false, error: text || `HTTP ${res.status}`, status: res.status };
    return { ok: true, data: text, status: res.status };
  }

  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  const cloudflareError = Array.isArray(data?.errors) && data.errors.length
    ? data.errors.map((e) => e.message || e.code).filter(Boolean).join("; ")
    : null;
  if (!res.ok || data?.success === false) {
    return { ok: false, error: cloudflareError || data?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }

  return {
    ok: true,
    data: data?.result !== undefined ? data.result : data,
    resultInfo: data?.result_info || null,
    status: res.status
  };
}

function compactZone(zone) {
  return {
    id: zone?.id,
    name: zone?.name,
    status: zone?.status,
    paused: zone?.paused,
    type: zone?.type,
    account_id: zone?.account?.id,
    account_name: zone?.account?.name,
    created_on: zone?.created_on,
    modified_on: zone?.modified_on,
    name_servers: Array.isArray(zone?.name_servers) ? zone.name_servers.join(", ") : ""
  };
}

function compactDnsRecord(record) {
  return {
    id: record?.id,
    zone_id: record?.zone_id,
    name: record?.name,
    type: record?.type,
    content: record?.content,
    ttl: record?.ttl,
    proxied: record?.proxied,
    comment: record?.comment,
    created_on: record?.created_on,
    modified_on: record?.modified_on
  };
}

function compactKvNamespace(ns) {
  return {
    id: ns?.id,
    title: ns?.title,
    supports_url_encoding: ns?.supports_url_encoding
  };
}

function buildObjectFromFields(rows) {
  const object = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row && row.fieldKey || '').trim();
    if (!key) continue;
    let value = row.fieldValue;
    switch (row.fieldType || 'string') {
      case 'number': value = Number(value); if (Number.isNaN(value)) return { ok: false, error: `Nombre invalide pour ${key}.` }; break;
      case 'boolean': value = value === true || String(value).toLowerCase() === 'true'; break;
      case 'json': try { value = JSON.parse(String(value || 'null')); } catch { return { ok: false, error: `JSON invalide pour ${key}.` }; } break;
      case 'null': value = null; break;
      default: value = value == null ? '' : String(value);
    }
    object[key] = value;
  }
  return { ok: true, object: Object.keys(object).length ? object : undefined };
}

module.exports = {
  utils: {
    cloudflareRequest,
    compactDnsRecord,
    compactKvNamespace,
    compactZone,
    parseBoolean,
    parseJsonInput,
    parseList,
    toInt,
    buildObjectFromFields
  }
};
