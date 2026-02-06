async function freshdeskRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const domain = credentials.domain;
  const apiKey = credentials.apiKey;
  if (!domain || !apiKey) return { ok: false, error: "Missing Freshdesk credentials (domain, apiKey)." };

  const url = new URL(`https://${domain}.freshdesk.com/api/v2${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    return { ok: false, error: data?.description || data?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { freshdeskRequest } };
