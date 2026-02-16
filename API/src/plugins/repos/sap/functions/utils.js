/**
 * SAP OData utilities - handles Basic Auth, CSRF token, and sap-client header.
 */

let csrfToken = null;
let csrfCookies = null;

async function fetchCsrfToken(baseUrl, headers) {
  const res = await fetch(
    `${baseUrl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$top=0`,
    {
      method: "GET",
      headers: { ...headers, "x-csrf-token": "Fetch" },
    }
  );
  csrfToken = res.headers.get("x-csrf-token") || null;
  const cookies = res.headers.get("set-cookie") || "";
  csrfCookies = cookies;
  return csrfToken;
}

async function sapRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { baseUrl, username, password, client } = credentials;
  if (!baseUrl || !username || !password) {
    return { ok: false, error: "Missing SAP credentials." };
  }

  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBase}${path}`);
  if (client) url.searchParams.set("sap-client", client);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "")
        url.searchParams.set(k, String(v));
    }
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const method = options.method || "GET";

  // For write operations, get CSRF token first
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (!csrfToken) {
      try {
        await fetchCsrfToken(normalizedBase, {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        });
      } catch {}
    }
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    if (csrfCookies) headers["Cookie"] = csrfCookies;
  }

  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  // CSRF token expired? Retry once
  if (
    res.status === 403 &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  ) {
    csrfToken = null;
    try {
      await fetchCsrfToken(normalizedBase, {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      });
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
      if (csrfCookies) headers["Cookie"] = csrfCookies;
      res = await fetch(url, { method, headers, body });
    } catch (e) {
      return { ok: false, error: e.message };
    }
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
      error:
        (data && data.error && data.error.message && data.error.message.value) ||
        `HTTP ${res.status}`,
      status: res.status,
      details: data,
    };
  }
  return { ok: true, data: (data && data.d) || data };
}

module.exports = { utils: { sapRequest, fetchCsrfToken } };
