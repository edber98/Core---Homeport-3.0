const API_BASE = "https://api.box.com/2.0";
const UPLOAD_BASE = "https://upload.box.com/api/2.0";

async function readResponse(res) {
  const contentType = res && res.headers && res.headers.get ? String(res.headers.get("content-type") || "") : "";
  if (contentType && !contentType.includes("application/json")) {
    return res && typeof res.text === "function" ? res.text() : "";
  }
  const text = res && typeof res.text === "function" ? await res.text() : "";
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function credentials(opts) {
  return (opts && opts.credentials) || {};
}

function accessToken(opts) {
  const token = credentials(opts).accessToken;
  if (!token) return null;
  return token;
}

async function boxRequest(opts, method, path, options = {}) {
  const token = accessToken(opts);
  if (!token) return { ok: false, error: "Token d'accès Box manquant." };

  const base = options.upload ? UPLOAD_BASE : API_BASE;
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers = { authorization: `Bearer ${token}`, ...(options.headers || {}) };
  let body = options.body;
  if (body && !(body instanceof FormData) && !Buffer.isBuffer(body)) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const data = await readResponse(res);
  if (!res.ok) {
    return {
      ok: false,
      error: (data && (data.message || data.error_description || data.code)) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }
  return { ok: true, data, status: res.status };
}

function mapItem(item) {
  return {
    id: item.id || "",
    type: item.type || "",
    name: item.name || "",
    size: item.size || 0,
    parentId: item.parent ? item.parent.id || "" : "",
    createdAt: item.created_at || "",
    modifiedAt: item.modified_at || "",
    url: item.url || item.shared_link?.url || ""
  };
}

function entries(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.entries)) return data.entries;
  return [];
}

async function resolveFile(value, opts) {
  if (!value) return null;
  if (value && typeof value === "object" && (value._type === "fileRef" || value.fileId) && opts && opts.files) {
    return opts.files.resolveAsBuffer(value);
  }
  if (typeof value === "string" && /^https?:\/\//i.test(value) && opts && opts.files) {
    return opts.files.resolveAsBuffer(value);
  }
  if (Buffer.isBuffer(value)) return value;
  return Buffer.from(String(value), "utf8");
}

module.exports = { utils: { boxRequest, mapItem, entries, resolveFile } };
