const crypto = require("crypto");

function cleanBaseUrl(value, fallback) {
  return String(value || fallback).replace(/\/+$/, "");
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

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "oui", "on"].includes(String(value).trim().toLowerCase());
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

function signJwt(credentials, uri, bodyText) {
  const apiKey = credentials.apiKey;
  const privateKey = normalizePrivateKey(credentials.privateKey);
  if (!apiKey || !privateKey) throw new Error("Clé API et clé privée Fireblocks requises.");

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    uri,
    nonce: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
    iat: now,
    exp: now + 55,
    sub: apiKey,
    bodyHash: crypto.createHash("sha256").update(bodyText || "").digest("hex")
  };
  const header = { alg: "RS256", typ: "JWT" };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey);
  return `${unsigned}.${base64url(signature)}`;
}

async function fireblocksRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = cleanBaseUrl(credentials.baseUrl, "https://api.fireblocks.io/v1");
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const bodyText = options.body === undefined ? "" : JSON.stringify(options.body);
  let jwt;
  try {
    jwt = signJwt(credentials, `${url.pathname}${url.search}`, bodyText);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const headers = {
    "Authorization": `Bearer ${jwt}`,
    "X-API-Key": credentials.apiKey,
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : bodyText
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

function compactVaultAccount(account) {
  return {
    id: account?.id,
    name: account?.name,
    hiddenOnUI: account?.hiddenOnUI,
    customerRefId: account?.customerRefId,
    autoFuel: account?.autoFuel,
    assets: Array.isArray(account?.assets) ? JSON.stringify(account.assets) : ""
  };
}

function compactVaultAsset(asset) {
  return {
    id: asset?.id,
    assetId: asset?.id || asset?.assetId,
    total: asset?.total,
    balance: asset?.balance,
    available: asset?.available,
    pending: asset?.pending,
    lockedAmount: asset?.lockedAmount,
    staked: asset?.staked
  };
}

function compactTransaction(tx) {
  return {
    id: tx?.id,
    status: tx?.status,
    subStatus: tx?.subStatus,
    assetId: tx?.assetId,
    amount: tx?.amount,
    netAmount: tx?.netAmount,
    sourceType: tx?.source?.type,
    sourceId: tx?.source?.id,
    destinationType: tx?.destination?.type,
    destinationId: tx?.destination?.id,
    txHash: tx?.txHash,
    createdAt: tx?.createdAt,
    lastUpdated: tx?.lastUpdated,
    note: tx?.note
  };
}

module.exports = {
  utils: {
    compactTransaction,
    compactVaultAccount,
    compactVaultAsset,
    fireblocksRequest,
    parseBoolean,
    parseJsonInput,
    toInt
  }
};
