const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIRESTORE_API = "https://firestore.googleapis.com/v1";
const FCM_API = "https://fcm.googleapis.com/v1";

let cachedToken = null;
let tokenExpiry = 0;

function cleanBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseJsonInput(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function splitLines(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value).split(/[\n,]+/).map((v) => v.trim()).filter(Boolean);
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return false;
  return ["1", "true", "yes", "oui", "on"].includes(String(value).trim().toLowerCase());
}

async function getAccessToken(credentials) {
  if (credentials.accessToken) return credentials.accessToken;

  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 30000) return cachedToken;

  const { clientId, clientSecret, refreshToken } = credentials;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Identifiants OAuth Google requis (clientId, clientSecret, refreshToken) ou accessToken.");
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
    throw new Error(data.error_description || data.error || "Impossible de rafraîchir le jeton Google.");
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function firebaseRequest(opts, url, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  let accessToken;
  try {
    accessToken = await getAccessToken(credentials);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const finalUrl = new URL(url);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== "") finalUrl.searchParams.append(key, String(item));
        }
      } else if (value !== undefined && value !== null && value !== "") {
        finalUrl.searchParams.set(key, String(value));
      }
    }
  }

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    ...(options.headers || {})
  };
  if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(finalUrl, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }
  return { ok: true, data, status: res.status };
}

function requireProject(credentials) {
  const projectId = String(credentials.projectId || "").trim();
  if (!projectId) throw new Error("ID de projet Firebase requis.");
  return projectId;
}

function databaseId(credentials, inputDatabaseId) {
  return String(inputDatabaseId || credentials.databaseId || "(default)").trim();
}

function encodePath(path) {
  return String(path || "").split("/").map((part) => encodeURIComponent(part)).join("/");
}

function firestoreDocumentUrl(credentials, documentPath, inputDatabaseId) {
  const projectId = requireProject(credentials);
  const db = databaseId(credentials, inputDatabaseId);
  return `${FIRESTORE_API}/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(db)}/documents/${encodePath(documentPath)}`;
}

function firestoreCollectionUrl(credentials, collectionPath, inputDatabaseId) {
  const projectId = requireProject(credentials);
  const db = databaseId(credentials, inputDatabaseId);
  return `${FIRESTORE_API}/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(db)}/documents/${encodePath(collectionPath)}`;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") {
    const fields = {};
    for (const [key, item] of Object.entries(value)) fields[key] = toFirestoreValue(item);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return firestoreFieldsToJson(value.mapValue.fields || {});
  return value;
}

function jsonToFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data || {})) fields[key] = toFirestoreValue(value);
  return fields;
}

function firestoreFieldsToJson(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = fromFirestoreValue(value);
  return out;
}

function compactDocument(doc) {
  const name = doc?.name || "";
  const marker = "/documents/";
  const path = name.includes(marker) ? name.slice(name.indexOf(marker) + marker.length) : name;
  const parts = path.split("/").filter(Boolean);
  const decoded = firestoreFieldsToJson(doc?.fields || {});
  return {
    name,
    path,
    id: parts[parts.length - 1] || "",
    createTime: doc?.createTime,
    updateTime: doc?.updateTime,
    fields: JSON.stringify(decoded)
  };
}

function realtimeDatabaseUrl(credentials, path) {
  const baseUrl = cleanBaseUrl(credentials.databaseUrl);
  if (!baseUrl) throw new Error("URL Realtime Database requise.");
  const cleanPath = String(path || "").replace(/^\/+|\/+$/g, "");
  return `${baseUrl}/${encodePath(cleanPath)}.json`;
}

module.exports = {
  utils: {
    FCM_API,
    compactDocument,
    firebaseRequest,
    firestoreCollectionUrl,
    firestoreDocumentUrl,
    jsonToFirestoreFields,
    parseBoolean,
    parseJsonInput,
    realtimeDatabaseUrl,
    splitLines,
    toInt
  }
};
