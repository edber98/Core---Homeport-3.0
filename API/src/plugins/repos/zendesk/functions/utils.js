async function zendeskRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const subdomain = credentials.subdomain;
  const email = credentials.email;
  const apiToken = credentials.apiToken;
  if (!subdomain || !email || !apiToken) return { ok: false, error: "Missing Zendesk credentials (subdomain, email, apiToken)." };

  const url = new URL(`https://${subdomain}.zendesk.com/api/v2${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Basic ${Buffer.from(`${email}/token:${apiToken}`).toString("base64")}`,
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
    return { ok: false, error: data?.error || data?.description || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { zendeskRequest } };
