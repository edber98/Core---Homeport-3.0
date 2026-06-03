const TOKEN_BASE = "https://login.microsoftonline.com";
const GRAPH_API = "https://graph.microsoft.com/v1.0";

// Runtime OAuth2 managé (SSO délégué via bouncer) : client_id/secret côté env,
// refresh token dans le credential, endpoint /common.
let getOAuth2AccessToken = null;
try { ({ getOAuth2AccessToken } = require("../../../../oauth/oauth2-runtime")); } catch { /* optionnel */ }

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken(credentials) {
  const creds = credentials || {};

  // SSO managé (bouncer) : pas de clientId/secret dans le credential → ils viennent
  // de l'env. On délègue au runtime (refresh_token, cache par credential intégré).
  const isManaged = !creds.clientId && !creds.clientSecret && (creds.providerKey || creds.refreshToken);
  if (isManaged && getOAuth2AccessToken) {
    return getOAuth2AccessToken({
      providerKey: String(creds.providerKey || "microsoft").trim() || "microsoft",
      credentials: creds,
    });
  }

  // Fallback legacy : identifiants saisis manuellement (tenant + app dédiée).
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 30000) return cachedToken;

  const { tenantId, clientId, clientSecret, refreshToken } = creds;
  if (!tenantId || !clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Microsoft OAuth2 credentials (tenantId, clientId, clientSecret, refreshToken).");
  }

  const url = `${TOKEN_BASE}/${tenantId}/oauth2/v2.0/token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/.default"
    })
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to refresh Microsoft token.");
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function graphRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  let accessToken;
  try {
    accessToken = await getAccessToken(credentials);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const url = path.startsWith("http") ? path : `${GRAPH_API}${path}`;
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    ...(options.headers || {})
  };
  if (!options.rawBody) headers["Content-Type"] = "application/json";

  const method = options.method || "GET";
  let body = undefined;
  if (options.body !== undefined) body = options.rawBody ? options.body : JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (options.rawResponse) {
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    const buffer = await res.arrayBuffer();
    return { ok: true, data: Buffer.from(buffer).toString("base64"), mimeType: res.headers.get("content-type") };
  }

  // DELETE often returns 204 No Content
  if (res.status === 204) {
    return { ok: true, data: null };
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data };
}

module.exports = { utils: { graphRequest, getAccessToken, GRAPH_API } };
