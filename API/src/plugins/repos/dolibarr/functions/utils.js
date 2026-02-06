/**
 * Dolibarr REST API utility
 * Base URL: {url}/api/index.php
 * Auth: DOLAPIKEY header
 */

async function dolibarrRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { url, apiKey } = credentials;
  if (!url || !apiKey) return { ok: false, error: "Identifiants Dolibarr manquants (url, apiKey)." };

  const baseUrl = url.replace(/\/+$/, "") + "/api/index.php";
  const fullUrl = `${baseUrl}${path}`;

  const headers = {
    "DOLAPIKEY": apiKey,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const method = options.method || "GET";
  let body = undefined;
  if (options.body) body = JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(fullUrl, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (res.status === 204) return { ok: true, data: null };

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = (data && typeof data === "object")
      ? (data.error && data.error.message) || (data.errors && data.errors[0] && data.errors[0].message) || JSON.stringify(data)
      : (typeof data === "string" ? data : `HTTP ${res.status}`);
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data };
}

module.exports = { utils: { dolibarrRequest } };
