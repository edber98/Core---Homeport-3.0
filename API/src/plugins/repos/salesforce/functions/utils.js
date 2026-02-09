let _tokenCache = {};

async function getAccessToken(credentials) {
  const key = (credentials.instanceUrl || "") + (credentials.clientId || "");
  const cached = _tokenCache[key];
  if (cached && cached.expiresAt > Date.now() + 60000) return { ok: true, accessToken: cached.accessToken };

  const instanceUrl = (credentials.instanceUrl || "").replace(/\/+$/, "");
  if (!instanceUrl) return { ok: false, error: "Missing instanceUrl." };

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: credentials.clientId || "",
    client_secret: credentials.clientSecret || "",
    refresh_token: credentials.refreshToken || ""
  });

  let res;
  try {
    res = await fetch(`${instanceUrl}/services/oauth2/token`, { method: "POST", body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) return { ok: false, error: data?.error_description || `HTTP ${res.status}`, details: data };

  _tokenCache[key] = { accessToken: data.access_token, expiresAt: Date.now() + ((data.expires_in || 7200) - 120) * 1000 };
  return { ok: true, accessToken: data.access_token };
}

async function sfRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const tokenRes = await getAccessToken(credentials);
  if (!tokenRes.ok) return tokenRes;

  const instanceUrl = (credentials.instanceUrl || "").replace(/\/+$/, "");
  const base = `${instanceUrl}/services/data/v59.0`;
  const url = new URL(`${base}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${tokenRes.accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const bodyStr = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body: bodyStr });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const errMsg = Array.isArray(data) ? (data[0]?.message || `HTTP ${res.status}`) : (data?.message || `HTTP ${res.status}`);
    return { ok: false, error: errMsg, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { sfRequest } };
