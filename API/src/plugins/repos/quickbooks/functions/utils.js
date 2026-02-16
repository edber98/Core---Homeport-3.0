async function getAccessToken(credentials) {
  const { clientId, clientSecret, refreshToken } = credentials;
  if (!clientId || !clientSecret || !refreshToken) {
    return { ok: false, error: "Missing QuickBooks OAuth2 credentials (clientId, clientSecret, refreshToken)." };
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let res;
  try {
    res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
    });
  } catch (e) {
    return { ok: false, error: "Token refresh failed: " + e.message };
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "Token refresh: invalid response" }; }
  if (!res.ok) return { ok: false, error: data.error_description || data.error || `HTTP ${res.status}` };

  return { ok: true, accessToken: data.access_token };
}

async function qbRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const realmId = credentials.realmId;
  if (!realmId) return { ok: false, error: "Missing QuickBooks realmId." };

  const tokenResult = await getAccessToken(credentials);
  if (!tokenResult.ok) return tokenResult;

  const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${encodeURIComponent(realmId)}`;
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${tokenResult.accessToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const fault = data?.Fault?.Error?.[0];
    return { ok: false, error: fault?.Message || fault?.Detail || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

async function qbQuery(opts, query, maxResults) {
  let q = query;
  if (maxResults && !q.toLowerCase().includes("maxresults")) q += ` MAXRESULTS ${maxResults}`;
  return qbRequest(opts, "/query", { query: { query: q } });
}

module.exports = { utils: { qbRequest, qbQuery, getAccessToken } };
