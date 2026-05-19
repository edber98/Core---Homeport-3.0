async function getAccessToken(opts) {
  const credentials = (opts && opts.credentials) || {};
  const tenantId = credentials.tenantId;
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;
  if (!tenantId || !clientId || !clientSecret) {
    return { ok: false, error: "Identifiants Microsoft Graph incomplets." };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });

  let res;
  try {
    res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
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

async function graphRequest(opts, path, options = {}) {
  const token = await getAccessToken(opts);
  if (!token.ok) return token;

  const headers = {
    Authorization: `Bearer ${token.accessToken}`,
    ...(options.headers || {})
  };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      method: options.method || "GET",
      headers,
      body: options.rawBody !== undefined ? options.rawBody : options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  return { ok: true, data };
}

async function resolveFileBuffer(inputs, opts) {
  const fileVal = inputs.file || inputs.content || "";
  if (fileVal && opts && opts.files && typeof fileVal === "object" && fileVal._type === "fileRef") {
    return opts.files.resolveAsBuffer(fileVal);
  }
  if (fileVal && opts && opts.files && typeof fileVal === "string" && /^https?:\/\//i.test(fileVal)) {
    return opts.files.resolveAsBuffer(fileVal);
  }
  return Buffer.isBuffer(fileVal) ? fileVal : Buffer.from(String(fileVal || ""));
}

module.exports = { utils: { graphRequest, resolveFileBuffer } };
