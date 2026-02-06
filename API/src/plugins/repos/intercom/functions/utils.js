async function intercomRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  if (!accessToken) return { ok: false, error: "Missing Intercom access token." };

  const url = new URL(`https://api.intercom.io${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Intercom-Version": "2.11",
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
    const errMsg = (data?.errors && data.errors[0]?.message) || data?.message || `HTTP ${res.status}`;
    return { ok: false, error: errMsg, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { intercomRequest } };
