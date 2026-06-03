const BASE_URLS = {
  sandbox: "https://gateway.stage.bill.com/connect",
  production: "https://gateway.prod.bill.com/connect"
};

function baseUrl(credentials) {
  const env = String((credentials && credentials.environment) || "sandbox").toLowerCase();
  return BASE_URLS[env] || BASE_URLS.sandbox;
}

async function readJsonResponse(res) {
  const text = res && typeof res.text === "function" ? await res.text() : "";
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseJson(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    throw new Error(`${label || "JSON"} invalide: ${e.message}`);
  }
}

async function billRequest(opts, method, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const devKey = credentials.devKey || credentials.developerKey;
  const sessionId = options.sessionId || credentials.sessionId;
  if (!devKey) return { ok: false, error: "Clé développeur BILL manquante." };
  if (options.auth !== false && !sessionId) return { ok: false, error: "Session BILL manquante." };

  const url = new URL(`${baseUrl(credentials)}${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers = {
    "content-type": "application/json",
    "accept": "application/json",
    "devKey": devKey
  };
  if (options.auth !== false) headers.sessionId = sessionId;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const data = await readJsonResponse(res);
  if (!res.ok) {
    return {
      ok: false,
      error: (data && (data.message || data.errorMessage || data.error)) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }
  return { ok: true, data };
}

function items(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data[key])) return data[key];
  if (Array.isArray(data && data.results)) return data.results;
  if (Array.isArray(data && data.data)) return data.data;
  return [];
}

function pickId(obj) {
  return (obj && (obj.id || obj.vendorId || obj.billId || obj.paymentId)) || "";
}

module.exports = { utils: { billRequest, parseJson, items, pickId, BASE_URLS } };
