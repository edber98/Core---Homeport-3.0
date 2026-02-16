const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken(credentials) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 30000) return cachedToken;

  const { clientId, clientSecret, refreshToken } = credentials;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth2 credentials (clientId, clientSecret, refreshToken).");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to refresh Google token.");
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function googleRequest(opts, url, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  let accessToken;
  try {
    accessToken = await getAccessToken(credentials);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    ...(options.headers || {})
  };
  if (!options.rawBody) headers["Content-Type"] = "application/json";

  const method = options.method || "GET";
  let body = undefined;
  if (options.body) body = options.rawBody ? options.body : JSON.stringify(options.body);

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

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data };
}

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DOCS_API = "https://docs.googleapis.com/v1/documents";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

module.exports = { utils: { googleRequest, getAccessToken, DRIVE_API, DOCS_API, SHEETS_API, CALENDAR_API } };
