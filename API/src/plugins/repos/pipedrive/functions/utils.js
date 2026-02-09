async function pdRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiToken = credentials.apiToken;
  if (!apiToken) return { ok: false, error: "Missing Pipedrive API token." };

  const url = new URL(`https://api.pipedrive.com/v1${path}`);
  url.searchParams.set("api_token", apiToken);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
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
    return { ok: false, error: data?.error || `HTTP ${res.status}`, status: res.status, details: data };
  }
  if (data && data.success === false) {
    return { ok: false, error: data.error || "API error", details: data };
  }
  return { ok: true, data: data?.data ?? data };
}

module.exports = { utils: { pdRequest } };
