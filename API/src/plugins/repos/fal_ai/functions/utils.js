async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Clé API fal manquante." };

  const baseUrl = String(credentials.baseUrl || "https://queue.fal.run").replace(/\/+$/, "");
  const reqPath = String(path || "");
  const url = new URL(reqPath.startsWith("http") ? reqPath : `${baseUrl}${reqPath.startsWith("/") ? reqPath : "/" + reqPath}`);

  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && item !== "") url.searchParams.append(k, String(item));
        }
      } else if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const scheme = String(credentials.authScheme || "Key").trim();
  const headers = {
    Authorization: `${scheme} ${apiKey}`,
    ...(options.headers || {})
  };

  let body;
  if (options.body !== undefined && options.body !== null && options.body !== "") {
    body = JSON.stringify(options.body);
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body
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
    return {
      ok: false,
      error: data?.message || data?.error || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

module.exports = { utils: { providerRequest } };
