async function getAccessToken(opts) {
  const credentials = (opts && opts.credentials) || {};
  const tenantId = credentials.tenantId;
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;
  if (!tenantId || !clientId || !clientSecret) {
    return { ok: false, error: "Identifiants Microsoft Graph incomplets." };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });

  let res;
  try {
    res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok || !data || !data.access_token) {
    return { ok: false, error: data?.error_description || data?.error || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, accessToken: data.access_token };
}

async function graphRequest(opts, path, options = {}) {
  const token = await getAccessToken(opts);
  if (!token.ok) return token;

  const url = `https://graph.microsoft.com/v1.0${path}`;
  const headers = {
    Authorization: `Bearer ${token.accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  return { ok: true, data };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = { utils: { graphRequest, parseJson } };
