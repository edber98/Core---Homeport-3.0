function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function parseJsonInput(value, label, options = {}) {
  const { defaultValue = undefined, allowArray = true, allowObject = true } = options;
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      if (!allowArray) throw new Error(`JSON invalide dans ${label}: tableau non autorise.`);
      return value;
    }
    if (!allowObject) throw new Error(`JSON invalide dans ${label}: objet non autorise.`);
    return value;
  }
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed) && !allowArray) throw new Error(`JSON invalide dans ${label}: tableau non autorise.`);
    if (!Array.isArray(parsed) && (!parsed || typeof parsed !== "object") && allowObject) {
      throw new Error(`JSON invalide dans ${label}: objet attendu.`);
    }
    return parsed;
  } catch (e) {
    if (/JSON invalide/.test(String(e && e.message))) throw e;
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return !!fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "oui", "on"].includes(s)) return true;
  if (["0", "false", "no", "non", "off"].includes(s)) return false;
  return !!fallback;
}

function normalizeBase(url, fallback) {
  const raw = String(url || fallback || "").trim();
  return raw.replace(/\/+$/, "");
}

function toInt01(value, fallback = 0) {
  return parseBoolean(value, fallback) ? 1 : 0;
}

function ensureProjectToken(opts) {
  const credentials = asObject(opts && opts.credentials);
  const token = String(credentials.projectToken || "").trim();
  if (!token) throw new Error("Project token Mixpanel manquant.");
  return token;
}

function getServiceAuth(opts) {
  const credentials = asObject(opts && opts.credentials);
  const username = String(credentials.serviceAccountUsername || "").trim();
  const secret = String(credentials.serviceAccountSecret || "").trim();
  if (!username || !secret) {
    throw new Error("Identifiants service account requis (username + secret). ");
  }
  return Buffer.from(`${username}:${secret}`).toString("base64");
}

async function requestJson(url, options = {}) {
  const method = options.method || "GET";
  const headers = { ...(options.headers || {}) };
  let body = undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = headers["Content-Type"].includes("application/json") ? JSON.stringify(options.body) : options.body;
  }

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
    const err = data?.error || data?.message || data?.detail || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: String(err), details: data };
  }

  return { ok: true, status: res.status, data };
}

async function mixpanelIngestRequest(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = normalizeBase(credentials.ingestBaseUrl, "https://api.mixpanel.com");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  const query = asObject(options.query);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });

  return requestJson(url, {
    method: options.method || "POST",
    headers: { Accept: "application/json", ...(options.headers || {}) },
    body: options.body
  });
}

async function mixpanelQueryRequest(opts, path, options = {}) {
  let auth;
  try {
    auth = getServiceAuth(opts);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const credentials = asObject(opts && opts.credentials);
  const baseUrl = normalizeBase(credentials.queryBaseUrl, "https://mixpanel.com");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  const query = asObject(options.query);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });

  return requestJson(url, {
    method: options.method || "GET",
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json", ...(options.headers || {}) },
    body: options.body
  });
}

module.exports = {
  utils: {
    asObject,
    parseJsonInput,
    parseBoolean,
    toInt01,
    ensureProjectToken,
    mixpanelIngestRequest,
    mixpanelQueryRequest
  }
};
