const DEFAULT_BASE_URL = "https://openproject.c4rbon.group/api/v3";

function normalizeBaseUrl(url) {
  const value = String(url || "").trim();
  return value ? value.replace(/\/+$/, "") : DEFAULT_BASE_URL;
}

function buildAuthHeader(apiKey) {
  const token = Buffer.from(`apikey:${apiKey}`).toString("base64");
  return `Basic ${token}`;
}

async function openprojectRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = normalizeBaseUrl(credentials.baseUrl);
  const apiKey = credentials.apiKey;
  if (!apiKey) {
    return { ok: false, error: "Missing OpenProject API key." };
  }

  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${urlPath}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": buildAuthHeader(apiKey),
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }

  const text = await res.text();
  const responseHeaders = {};
  try {
    for (const [key, value] of res.headers.entries()) {
      responseHeaders[key.toLowerCase()] = value;
    }
  } catch {}
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const errorMsg = data && data.message ? data.message : `HTTP ${res.status}`;
    return { ok: false, error: errorMsg, status: res.status, details: data, headers: responseHeaders };
  }

  return { ok: true, data, headers: responseHeaders };
}

module.exports = { utils: { openprojectRequest, normalizeBaseUrl, DEFAULT_BASE_URL } };
