function cleanBaseUrl(value, fallback) {
  return String(value || fallback).replace(/\/+$/, "");
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "oui", "on"].includes(String(value).trim().toLowerCase());
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value).split(/[\n,]+/).map((v) => v.trim()).filter(Boolean);
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

async function resendRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Clé API Resend manquante." };

  const baseUrl = cleanBaseUrl(credentials.baseUrl, "https://api.resend.com");
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "Kinn-Homeport/1.0",
    ...(options.headers || {})
  };
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

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
    return { ok: false, error: data?.message || data?.error || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data, status: res.status };
}

function compactEmail(email) {
  return {
    id: email?.id,
    from: email?.from,
    to: Array.isArray(email?.to) ? email.to.join(", ") : email?.to,
    subject: email?.subject,
    created_at: email?.created_at,
    last_event: email?.last_event,
    scheduled_at: email?.scheduled_at,
    cc: Array.isArray(email?.cc) ? email.cc.join(", ") : email?.cc,
    bcc: Array.isArray(email?.bcc) ? email.bcc.join(", ") : email?.bcc,
    reply_to: Array.isArray(email?.reply_to) ? email.reply_to.join(", ") : email?.reply_to
  };
}

function compactDomain(domain) {
  return {
    id: domain?.id,
    name: domain?.name,
    status: domain?.status,
    region: domain?.region,
    created_at: domain?.created_at,
    sending: domain?.capabilities?.sending,
    receiving: domain?.capabilities?.receiving,
    records: domain?.records ? JSON.stringify(domain.records) : ""
  };
}

function compactContact(contact) {
  return {
    id: contact?.id,
    email: contact?.email,
    first_name: contact?.first_name || contact?.firstName,
    last_name: contact?.last_name || contact?.lastName,
    unsubscribed: contact?.unsubscribed,
    created_at: contact?.created_at,
    properties: contact?.properties ? JSON.stringify(contact.properties) : ""
  };
}

function compactSegment(segment) {
  return {
    id: segment?.id,
    name: segment?.name,
    created_at: segment?.created_at
  };
}

module.exports = {
  utils: {
    compactContact,
    compactDomain,
    compactEmail,
    compactSegment,
    parseBoolean,
    parseJsonInput,
    parseList,
    resendRequest,
    toInt
  }
};
