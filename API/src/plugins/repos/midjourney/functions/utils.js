function getCredentials(opts) {
  const credentials = (opts && opts.credentials) || {};
  return {
    apiKey: String(credentials.apiKey || "").trim(),
    baseUrl: String(credentials.baseUrl || "https://api.midjourney-api.com").replace(/\/+$/, "")
  };
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

function normalizeApiError(data, fallbackStatus) {
  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (typeof data.status === "number" && data.status !== 0) return `Erreur API Midjourney (${data.status}).`;
  }
  return fallbackStatus ? `HTTP ${fallbackStatus}` : "Erreur API Midjourney.";
}

function statusLabel(statusCode) {
  if (statusCode === 0) return "en_cours";
  if (statusCode === 1) return "succès";
  if (statusCode === 2) return "échec";
  return "inconnu";
}

function toIsoDateFromMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  try {
    return new Date(n).toISOString();
  } catch {
    return "";
  }
}

function parseTaskIdsInput(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }

  if (typeof value === "object" && value !== null) {
    const arr = Array.isArray(value.taskIds) ? value.taskIds : [];
    return arr.map((v) => String(v || "").trim()).filter(Boolean);
  }

  const str = String(value || "").trim();
  if (!str) return [];

  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v || "").trim()).filter(Boolean);
    } catch {
      // fallback split below
    }
  }

  return str
    .split(/[\n,;]+/g)
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

async function midjourneyRequest(opts, path, options = {}) {
  const { apiKey, baseUrl } = getCredentials(opts);
  if (!apiKey) return { ok: false, error: "Clé API Midjourney manquante." };

  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Content-Type": "application/json",
    "API-KEY": apiKey,
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
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      error: normalizeApiError(data, res.status),
      status: res.status,
      details: data
    };
  }

  if (data && typeof data === "object" && typeof data.status === "number" && data.status !== 0) {
    return {
      ok: false,
      error: normalizeApiError(data),
      status: 200,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

module.exports = {
  utils: {
    midjourneyRequest,
    parseJsonInput,
    parseTaskIdsInput,
    statusLabel,
    toIsoDateFromMs
  }
};
