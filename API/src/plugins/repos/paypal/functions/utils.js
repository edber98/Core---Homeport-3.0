function baseUrl(credentials = {}) {
  return credentials.environment === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(opts) {
  const credentials = (opts && opts.credentials) || {};
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;
  if (!clientId || !clientSecret) return { ok: false, error: "Identifiants PayPal incomplets." };

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let res;
  try {
    res = await fetch(`${baseUrl(credentials)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
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

async function paypalRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const token = await getAccessToken(opts);
  if (!token.ok) return token;

  const headers = {
    Authorization: `Bearer ${token.accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(`${baseUrl(credentials)}${path}`, {
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
  if (!res.ok) return { ok: false, error: data?.message || data?.error_description || `HTTP ${res.status}`, status: res.status, details: data };
  return { ok: true, data, status: res.status };
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

function firstLink(data, rel) {
  const link = ((data && data.links) || []).find((item) => item.rel === rel);
  return link ? link.href || "" : "";
}

function mapOrder(data = {}) {
  const unit = (data.purchase_units || [])[0] || {};
  const capture = (((unit.payments || {}).captures || [])[0]) || {};
  const amount = capture.amount || unit.amount || {};
  return {
    ok: true,
    id: data.id || "",
    status: data.status || "",
    intent: data.intent || "",
    approveUrl: firstLink(data, "approve"),
    captureId: capture.id || "",
    amount: amount.value || "",
    currency: amount.currency_code || ""
  };
}

function mapInvoice(data = {}) {
  const total = data.amount || data.due_amount || {};
  return {
    ok: true,
    id: data.id || "",
    status: data.status || "",
    number: data.detail?.invoice_number || data.invoice_number || "",
    total: total.value || "",
    detailUrl: firstLink(data, "self")
  };
}

module.exports = { utils: { paypalRequest, parseJson, mapOrder, mapInvoice } };
