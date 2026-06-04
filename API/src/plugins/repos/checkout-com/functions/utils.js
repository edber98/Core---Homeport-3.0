function cleanBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "oui", "on"].includes(String(value).trim().toLowerCase());
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

function addIf(body, key, value) {
  if (value !== undefined && value !== null && value !== "") body[key] = value;
}

async function checkoutRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const secretKey = credentials.secretKey;
  const baseUrl = cleanBaseUrl(credentials.baseUrl);
  if (!secretKey) return { ok: false, error: "Clé secrète Checkout.com manquante." };
  if (!baseUrl) return { ok: false, error: "URL API Checkout.com manquante." };

  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    "Authorization": `Bearer ${secretKey}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (options.idempotencyKey) headers["Cko-Idempotency-Key"] = options.idempotencyKey;

  let res;
  try {
    res = await fetch(url, {
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
    const error = data?.error_codes?.join(", ") || data?.message || data?.error || `HTTP ${res.status}`;
    return { ok: false, error, status: res.status, details: data };
  }

  return { ok: true, data, status: res.status };
}

function linkFrom(resource, rel) {
  return resource?._links?.[rel]?.href || "";
}

function compactPayment(payment) {
  return {
    id: payment?.id,
    status: payment?.status || payment?.approved,
    approved: payment?.approved,
    action_id: payment?.action_id,
    reference: payment?.reference,
    amount: payment?.amount,
    currency: payment?.currency,
    payment_type: payment?.payment_type,
    response_code: payment?.response_code,
    response_summary: payment?.response_summary,
    processed_on: payment?.processed_on,
    customer_email: payment?.customer?.email,
    redirect_url: linkFrom(payment, "redirect")
  };
}

function compactPaymentLink(link) {
  return {
    id: link?.id,
    status: link?.status,
    payment_id: link?.payment_id,
    amount: link?.amount,
    currency: link?.currency,
    reference: link?.reference,
    description: link?.description,
    created_on: link?.created_on,
    expires_on: link?.expires_on,
    redirect_url: linkFrom(link, "redirect"),
    self_url: linkFrom(link, "self")
  };
}

function compactAction(action) {
  return {
    action_id: action?.action_id || action?.id,
    id: action?.id,
    type: action?.type,
    response_code: action?.response_code,
    response_summary: action?.response_summary,
    status: action?.status,
    amount: action?.amount,
    currency: action?.currency,
    processed_on: action?.processed_on,
    reference: action?.reference
  };
}

function buildBodyFromFields(rows) {
  const body = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row && row.fieldKey || '').trim();
    if (!key) continue;
    let value = row.fieldValue;
    switch (row.fieldType || 'string') {
      case 'number': value = Number(value); if (Number.isNaN(value)) return { ok: false, error: `Nombre invalide pour ${key}.` }; break;
      case 'boolean': value = value === true || String(value).toLowerCase() === 'true'; break;
      case 'json': try { value = JSON.parse(String(value || 'null')); } catch { return { ok: false, error: `JSON invalide pour ${key}.` }; } break;
      case 'null': value = null; break;
      default: value = value == null ? '' : String(value);
    }
    body[key] = value;
  }
  return { ok: true, body: Object.keys(body).length ? body : undefined };
}

module.exports = {
  utils: {
    addIf,
    checkoutRequest,
    compactAction,
    compactPayment,
    compactPaymentLink,
    parseBoolean,
    parseJsonInput,
    toInt,
    buildBodyFromFields
  }
};
