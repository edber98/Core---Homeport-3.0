const DEFAULT_BASE_URL = "https://b2b.revolut.com/api/1.0";
const DEFAULT_TOKEN_URL = "https://b2b.revolut.com/api/1.0/auth/token";

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecord(record) {
  if (!isPlainObject(record)) {
    return { value: record, id: "", name: "", url: "", status: "", created_at: "", updated_at: "", raw: record };
  }

  return {
    ...record,
    id: String(
      record.id
      || record.account_id
      || record.counterparty_id
      || record.card_id
      || record.expense_id
      || record.transaction_id
      || record.webhook_id
      || record.group_id
      || record.label_id
      || ""
    ),
    name: String(
      record.name
      || record.title
      || record.reference
      || record.description
      || record.email
      || record.phone
      || ""
    ),
    url: String(record.url || record.host_url || ""),
    status: String(record.state || record.status || ""),
    created_at: record.created_at || record.createdAt || "",
    updated_at: record.updated_at || record.updatedAt || "",
    raw: record
  };
}

function listFromObject(payload) {
  const entry = Object.entries(payload).find(([, value]) => Array.isArray(value));
  if (!entry) return null;

  const [key, value] = entry;
  if (key === "data" && !Array.isArray(value)) return null;

  return {
    items: value.map(normalizeRecord),
    total: Number(payload.count || payload.total || value.length),
    next_cursor: payload.next_page_token || payload.nextPageToken || null
  };
}

function normalizeJsonResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload.map(normalizeRecord),
      total: payload.length,
      next_cursor: null
    };
  }

  if (!isPlainObject(payload)) return normalizeRecord(payload);

  const listPayload = listFromObject(payload);
  if (listPayload) return listPayload;

  return normalizeRecord(payload);
}

async function getAccessToken(credentials) {
  const directToken = credentials.accessToken;
  if (directToken) return { ok: true, accessToken: String(directToken) };

  const refreshToken = credentials.refreshToken;
  const clientAssertionJwt = credentials.clientAssertionJwt;
  if (!refreshToken || !clientAssertionJwt) {
    return {
      ok: false,
      error: "Identifiants Revolut Business manquants: accessToken direct ou refreshToken + clientAssertionJwt requis."
    };
  }

  const tokenUrl = String(credentials.tokenUrl || DEFAULT_TOKEN_URL);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(refreshToken),
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: String(clientAssertionJwt)
  });

  let res;
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: body.toString()
    });
  } catch (error) {
    return { ok: false, error: `Échec de récupération du token Revolut: ${error.message}` };
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok || !data?.access_token) {
    return {
      ok: false,
      error: data?.message || data?.error_description || data?.error || `HTTP ${res.status} lors du renouvellement du token Revolut.`
    };
  }

  return { ok: true, accessToken: data.access_token };
}

async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const tokenResult = await getAccessToken(credentials);
  if (!tokenResult.ok) return tokenResult;

  const baseUrl = String(credentials.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const absoluteUrl = /^https?:\/\//i.test(path)
    ? path
    : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const url = new URL(absoluteUrl);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === "") continue;
      const queryKey = key === "pageToken" ? "page_token" : key;
      url.searchParams.set(queryKey, String(value));
    }
  }

  const headers = {
    Authorization: `Bearer ${tokenResult.accessToken}`,
    Accept: "application/json",
    ...(options.headers || {})
  };

  let body;
  if (options.body !== undefined) {
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
      return {
        ok: false,
        error: data?.message || data?.error || `HTTP ${res.status}`,
        status: res.status,
        details: data
      };
    }

    return {
      ok: true,
      status: res.status,
      data: normalizeJsonResponse(data)
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

module.exports = { utils: { providerRequest, getAccessToken } };
