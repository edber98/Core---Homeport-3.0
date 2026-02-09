const ATERA_BASE = "https://app.atera.com/api/v3";

async function ateraRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Missing Atera API key." };

  const url = new URL(`${ATERA_BASE}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "X-API-KEY": apiKey,
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const method = options.method || "GET";
  let body = undefined;
  if (options.body) body = JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (res.status === 204) return { ok: true, data: null };

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    return { ok: false, error: data?.Message || `HTTP ${res.status}`, status: res.status, details: data };
  }

  return { ok: true, data };
}

module.exports = { utils: { ateraRequest } };
