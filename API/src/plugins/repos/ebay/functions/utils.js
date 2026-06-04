const USER_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const APP_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SANDBOX_USER_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";
const SANDBOX_APP_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

const DEFAULT_USER_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.finances",
  "https://api.ebay.com/oauth/api_scope/sell.negotiation",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly"
].join(" ");

const DEFAULT_APP_SCOPES = "https://api.ebay.com/oauth/api_scope";

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function baseHost(pathname, sandbox) {
  const host = sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
  const apizHost = sandbox ? "https://apiz.sandbox.ebay.com" : "https://apiz.ebay.com";
  if (/^https?:\/\//i.test(pathname)) {
    return pathname.replace(/^https?:\/\/[^/]+/i, sandbox ? host : host);
  }
  if (pathname.startsWith("/commerce/identity/")) return `${apizHost}${pathname}`;
  return `${host}${pathname}`;
}

function normalizeRecord(record) {
  if (!isPlainObject(record)) {
    return { value: record, id: "", name: "", url: "", status: "", created_at: "", updated_at: "", raw: record };
  }

  return {
    ...record,
    id: String(
      record.id
      || record.offerId
      || record.orderId
      || record.paymentDisputeId
      || record.destinationId
      || record.subscriptionId
      || record.topicId
      || record.userId
      || record.sku
      || record.charityOrgId
      || record.epid
      || ""
    ),
    name: String(
      record.name
      || record.title
      || record.label
      || record.policyName
      || record.sku
      || record.username
      || record.marketplaceId
      || ""
    ),
    url: String(record.url || record.website || ""),
    status: String(record.status || record.subscriptionStatus || record.fulfillmentStatus || ""),
    created_at: record.creationDate || record.creationTime || record.createdDate || "",
    updated_at: record.modificationDate || record.lastModifiedDate || record.updatedDate || "",
    raw: record
  };
}

function findArray(payload) {
  const entry = Object.entries(payload).find(([, value]) => Array.isArray(value));
  if (!entry) return null;
  const [key, value] = entry;
  return {
    items: value.map(normalizeRecord),
    total: Number(payload.total || payload.totalCount || payload.count || value.length),
    next_cursor: payload.next || payload.nextHref || null,
    key
  };
}

function normalizeJson(payload) {
  if (Array.isArray(payload)) {
    return { items: payload.map(normalizeRecord), total: payload.length, next_cursor: null };
  }
  if (!isPlainObject(payload)) return normalizeRecord(payload);

  const listPayload = findArray(payload);
  if (listPayload) return listPayload;

  const firstObjectEntry = Object.entries(payload).find(([, value]) => isPlainObject(value));
  if (firstObjectEntry && Object.keys(payload).length === 1) return normalizeRecord(firstObjectEntry[1]);

  return normalizeRecord(payload);
}

function tokenUrlForMode(mode, sandbox) {
  if (mode === "app") return sandbox ? SANDBOX_APP_TOKEN_URL : APP_TOKEN_URL;
  return sandbox ? SANDBOX_USER_TOKEN_URL : USER_TOKEN_URL;
}

async function mintToken(credentials, mode) {
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Client ID et client secret eBay requis." };
  }

  if (mode === "user") {
    const directToken = credentials.userAccessToken || credentials.accessToken;
    if (directToken) return { ok: true, accessToken: String(directToken) };
    if (!credentials.refreshToken) {
      return { ok: false, error: "Refresh token eBay manquant pour les appels vendeur." };
    }
  } else {
    const directToken = credentials.appAccessToken;
    if (directToken) return { ok: true, accessToken: String(directToken) };
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const scope = mode === "app"
    ? String(credentials.appScopes || DEFAULT_APP_SCOPES)
    : String(credentials.userScopes || DEFAULT_USER_SCOPES);
  const sandbox = credentials.environment === "sandbox";
  const body = new URLSearchParams();

  if (mode === "app") {
    body.set("grant_type", "client_credentials");
    body.set("scope", scope);
  } else {
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", String(credentials.refreshToken));
    body.set("scope", scope);
  }

  let res;
  try {
    res = await fetch(tokenUrlForMode(mode, sandbox), {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: body.toString()
    });
  } catch (error) {
    return { ok: false, error: `Échec de récupération du token eBay: ${error.message}` };
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok || !data?.access_token) {
    return {
      ok: false,
      error: data?.error_description || data?.error || `HTTP ${res.status} lors de la génération du token eBay.`
    };
  }

  return { ok: true, accessToken: data.access_token };
}

function authModeForPath(pathname) {
  if (pathname.includes("/commerce/notification/")) return "app";
  return "user";
}

function maybeBinaryPayload(body) {
  if (!isPlainObject(body)) return null;
  const contentBase64 = body.contentBase64 || body.base64 || body.dataBase64;
  if (!contentBase64) return null;
  return {
    buffer: Buffer.from(String(contentBase64), "base64"),
    contentType: body.contentType || body.mimeType || "application/octet-stream",
    fileName: body.fileName || "upload.bin"
  };
}

function parseBodyInputValue(value, expectedType) {
  if (value === undefined || value === null || value === '') return { present: false };
  if (expectedType === 'checkbox') return { present: true, value: Boolean(value) };
  if (expectedType === 'number') {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? { present: true, value: numberValue } : { present: false };
  }
  if (expectedType === 'json') {
    if (typeof value === 'object') return { present: true, value };
    try {
      return { present: true, value: JSON.parse(String(value)) };
    } catch {
      return { present: false, error: 'JSON invalide dans un champ du corps.' };
    }
  }
  return { present: true, value };
}

function buildBodyFromInputs(inputs, fields) {
  const body = {};
  let hasValue = false;

  for (const field of fields || []) {
    const source = typeof field === 'string' ? field : field.source;
    const target = typeof field === 'string' ? field : (field.target || field.source);
    const expectedType = typeof field === 'string' ? undefined : field.type;
    const parsed = parseBodyInputValue(inputs[source], expectedType);
    if (parsed.error) return { __invalid: parsed.error };
    if (!parsed.present) continue;
    body[target] = parsed.value;
    hasValue = true;
  }

  return hasValue ? body : undefined;
}

async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const sandbox = credentials.environment === "sandbox";
  const pathname = /^https?:\/\//i.test(path)
    ? path
    : path.startsWith("/")
      ? path
      : `/${path}`;
  const authMode = options.authMode || authModeForPath(pathname);
  const tokenResult = await mintToken(credentials, authMode);
  if (!tokenResult.ok) return tokenResult;

  const url = new URL(baseHost(pathname, sandbox));
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === "") continue;
      const queryKey = key === "marketplaceId" ? "marketplace_id" : key;
      url.searchParams.set(queryKey, String(value));
    }
  }

  const headers = {
    Authorization: `Bearer ${tokenResult.accessToken}`,
    Accept: "application/json",
    ...(options.headers || {})
  };

  const marketplaceId = options.query?.marketplaceId || credentials.marketplaceId;
  if (marketplaceId && (
    url.pathname.includes("/sell/account/")
    || url.pathname.includes("/sell/inventory/")
    || url.pathname.includes("/commerce/catalog/")
    || url.pathname.includes("/commerce/charity/")
    || url.pathname.includes("/sell/negotiation/")
  )) {
    headers["X-EBAY-C-MARKETPLACE-ID"] = String(marketplaceId);
  }

  const binaryUpload = maybeBinaryPayload(options.body);
  let body;
  if (binaryUpload) {
    headers["Content-Type"] = binaryUpload.contentType;
    body = binaryUpload.buffer;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body
    });
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const contentType = String(res.headers.get("content-type") || "");
  if (contentType.includes("application/json")) {
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      const err = Array.isArray(data?.errors) ? data.errors[0] : null;
      return {
        ok: false,
        error: err?.message || data?.message || `HTTP ${res.status}`,
        status: res.status,
        details: data
      };
    }

    return {
      ok: true,
      status: res.status,
      data: normalizeJson(data)
    };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    return {
      ok: false,
      error: buffer.toString("utf8") || `HTTP ${res.status}`,
      status: res.status
    };
  }

  return {
    ok: true,
    status: res.status,
    data: {
      id: "",
      name: "",
      url: "",
      status: String(res.status),
      created_at: "",
      updated_at: "",
      contentBase64: buffer.toString("base64"),
      contentType: contentType || "application/octet-stream",
      raw: {
        size: buffer.length,
        contentType: contentType || "application/octet-stream"
      }
    }
  };
}

module.exports = { utils: { providerRequest, buildBodyFromInputs } };
