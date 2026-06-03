const GRAPH_API = "https://graph.microsoft.com/v1.0";

// Runtime OAuth2 managé (SSO délégué via bouncer) : client_id/secret côté env,
// refresh token dans le credential, endpoint /common.
let getOAuth2AccessToken = null;
try { ({ getOAuth2AccessToken } = require("../../../../oauth/oauth2-runtime")); } catch { /* optionnel */ }

async function getAccessToken(opts) {
  const creds = (opts && opts.credentials) || {};
  if (!getOAuth2AccessToken) return { ok: false, error: "OAuth2 runtime indisponible." };
  try {
    const accessToken = await getOAuth2AccessToken({
      providerKey: String(creds.providerKey || "outlookCalendar").trim() || "outlookCalendar",
      credentials: creds,
    });
    return { ok: true, accessToken };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Appel Microsoft Graph. path relatif (ex "/me/events") ou absolu.
async function graphRequest(opts, path, options = {}) {
  const token = await getAccessToken(opts);
  if (!token.ok) return token;

  const url = path.startsWith("http") ? path : `${GRAPH_API}${path}`;
  const headers = { Authorization: `Bearer ${token.accessToken}`, ...(options.headers || {}) };
  let body;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (res.status === 204) return { ok: true, data: null };
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || data?.error || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

// Base de chemin Graph selon le calendrier ("primary"/vide = calendrier par défaut).
function calendarBase(calendarId) {
  const id = String(calendarId || "").trim();
  return (!id || id === "primary") ? "/me" : `/me/calendars/${encodeURIComponent(id)}`;
}

// Normalise une date/heure entrante vers le format Graph { dateTime, timeZone }.
function toGraphDateTime(value, timeZone = "UTC") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return { dateTime: raw, timeZone };
}

function mapCalendarEvent(data, fallback = {}) {
  const event = data && typeof data === "object" ? data : {};
  return {
    id: event.id || fallback.id || "",
    calendarId: fallback.calendarId || "",
    summary: event.summary || event.subject || fallback.summary || "",
    start: event.start?.dateTime || event.start?.date || fallback.start || "",
    end: event.end?.dateTime || event.end?.date || fallback.end || "",
    htmlLink: event.htmlLink || event.webLink || "",
    status: event.status || fallback.status || "ok",
    response: fallback.response || ""
  };
}

module.exports = { utils: { graphRequest, getAccessToken, calendarBase, toGraphDateTime, mapCalendarEvent, GRAPH_API } };
