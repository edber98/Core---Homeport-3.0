async function jiraRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const email = credentials.email;
  const apiToken = credentials.apiToken;
  const baseUrl = (credentials.baseUrl || "").replace(/\/+$/, "");
  if (!email || !apiToken) return { ok: false, error: "Missing Jira credentials (email + apiToken)." };
  if (!baseUrl) return { ok: false, error: "Missing Jira baseUrl." };

  const fullUrl = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") fullUrl.searchParams.set(k, String(v));
    }
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const headers = {
    "Authorization": `Basic ${auth}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(fullUrl, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const errMsg = (data && typeof data === "object") ? (data.errorMessages ? data.errorMessages.join(", ") : data.message || `HTTP ${res.status}`) : `HTTP ${res.status}`;
    return { ok: false, error: errMsg, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { jiraRequest } };
