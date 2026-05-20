const BASE_URLS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com"
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

function list(value, fallback) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return fallback || [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
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

async function plaidRequest(opts, path, body = {}) {
  const credentials = (opts && opts.credentials) || {};
  const clientId = credentials.clientId;
  const secret = credentials.secret;
  if (!clientId || !secret) return { ok: false, error: "Identifiants Plaid manquants." };

  let res;
  try {
    res = await fetch(`${baseUrl(credentials)}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify({ client_id: clientId, secret, ...body })
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const data = await readJsonResponse(res);
  if (!res.ok || data.error_code) {
    return {
      ok: false,
      error: (data && (data.error_message || data.error_code)) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }
  return { ok: true, data };
}

module.exports = { utils: { plaidRequest, parseJson, list, BASE_URLS } };
