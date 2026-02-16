async function clickupRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiToken = credentials.apiToken;
  if (!apiToken) return { ok: false, error: "Missing ClickUp API token." };

  const url = new URL(`https://api.clickup.com/api/v2${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": apiToken,
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
    const errMsg = (data && typeof data === "object") ? (data.err || data.error || `HTTP ${res.status}`) : `HTTP ${res.status}`;
    return { ok: false, error: errMsg, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { clickupRequest } };
