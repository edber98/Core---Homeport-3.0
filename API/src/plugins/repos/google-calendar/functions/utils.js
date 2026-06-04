const { getOAuth2AccessToken } = require("../../../../oauth/oauth2-runtime");

async function getAccessToken(credentials) {
  const providerKey = String(credentials?.providerKey || "googleCalendar").trim() || "googleCalendar";
  return getOAuth2AccessToken({ providerKey, credentials });
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

function parseJsonInput(value, label = "input") {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid JSON for ${label}.`);
    }
  }
  return value;
}

function parseStringList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    } catch {}
    return value.split(",").map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

module.exports = {
  utils: {
    googleRequest,
    getAccessToken,
    parseJsonInput,
    parseStringList,
    DRIVE_API,
    DOCS_API,
    SHEETS_API,
    CALENDAR_API
  }
};
