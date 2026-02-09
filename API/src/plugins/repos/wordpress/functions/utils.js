async function wpRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const siteUrl = (credentials.siteUrl || "").replace(/\/+$/, "");
  const username = credentials.username;
  const applicationPassword = credentials.applicationPassword;
  if (!siteUrl || !username || !applicationPassword) return { ok: false, error: "Missing WordPress credentials (siteUrl, username, applicationPassword)." };

  const url = new URL(`${siteUrl}/wp-json/wp/v2${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const auth = Buffer.from(`${username}:${applicationPassword}`).toString("base64");
  const headers = {
    "Authorization": `Basic ${auth}`,
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
    return { ok: false, error: data?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { wpRequest } };
