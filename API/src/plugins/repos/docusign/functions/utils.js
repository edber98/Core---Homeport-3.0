async function docusignRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  const accountId = credentials.accountId;
  const basePath = (credentials.basePath || "https://demo.docusign.net").replace(/\/$/, "");
  if (!accessToken) return { ok: false, error: "Missing DocuSign access token." };
  if (!accountId) return { ok: false, error: "Missing DocuSign account ID." };

  const base = `${basePath}/restapi/v2.1/accounts/${accountId}`;
  const url = new URL(`${base}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
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
    return { ok: false, error: data?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { docusignRequest } };
