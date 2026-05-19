function credentials(opts) {
  const c = (opts && opts.credentials) || {};
  const apiKey = String(c.apiKey || "").trim();
  if (!apiKey) return { ok: false, error: "Clé API Adyen requise." };
  const merchantAccount = String(c.merchantAccount || "").trim();
  const baseUrl = String(c.baseUrl || "https://checkout-test.adyen.com").replace(/\/+$/, "");
  const apiVersion = String(c.apiVersion || "v70").replace(/^\/+/, "");
  return { ok: true, apiKey, merchantAccount, baseUrl, apiVersion };
}

async function adyenRequest(opts, path, options = {}) {
  const auth = credentials(opts);
  if (!auth.ok) return auth;

  const url = new URL(`${auth.baseUrl}/${auth.apiVersion}${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers = {
    "X-API-Key": auth.apiKey,
    "Content-Type": "application/json"
  };
  if (options.idempotencyKey) headers["Idempotency-Key"] = String(options.idempotencyKey);

  const fetchOptions = { method: options.method || "GET", headers };
  if (options.body !== undefined) fetchOptions.body = JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text().catch(() => "");
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data?.message || data?.error || data?.errorMessage || `Erreur Adyen ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function amountFromInputs(d) {
  const value = d.value === undefined || d.value === null || d.value === "" ? undefined : Number(d.value);
  const currency = String(d.currency || "").trim();
  if (value === undefined || !currency) return undefined;
  return { value, currency };
}

function compact(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}

function boolValue(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function merchantAccount(opts, inputs) {
  return String((inputs && inputs.merchantAccount) || (opts && opts.credentials && opts.credentials.merchantAccount) || "").trim();
}

function basePaymentBody(opts, inputs) {
  const d = inputs || {};
  const merchant = merchantAccount(opts, d);
  if (!merchant) return { ok: false, error: "Compte marchand Adyen requis." };
  const amount = amountFromInputs(d);
  if (!amount) return { ok: false, error: "Montant et devise requis." };
  return { ok: true, body: { merchantAccount: merchant, amount } };
}

function paymentLinkResult(data) {
  return {
    ok: true,
    id: data?.id,
    url: data?.url,
    status: data?.status,
    reference: data?.reference,
    expiresAt: data?.expiresAt,
    reusable: data?.reusable,
    merchantAccount: data?.merchantAccount,
    raw: data
  };
}

function paymentResult(data) {
  return {
    ok: true,
    resultCode: data?.resultCode,
    pspReference: data?.pspReference,
    refusalReason: data?.refusalReason,
    merchantReference: data?.merchantReference || data?.reference,
    action: data?.action || null,
    amount: data?.amount || null,
    raw: data
  };
}

function modificationResult(data) {
  return {
    ok: true,
    pspReference: data?.pspReference,
    paymentPspReference: data?.paymentPspReference,
    status: data?.status,
    reference: data?.reference,
    raw: data
  };
}

module.exports = {
  utils: {
    adyenRequest,
    parseJson,
    amountFromInputs,
    compact,
    boolValue,
    merchantAccount,
    basePaymentBody,
    paymentLinkResult,
    paymentResult,
    modificationResult
  }
};
