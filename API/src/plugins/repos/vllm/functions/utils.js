async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;

  const baseUrl = String(credentials.baseUrl || "http://localhost:8000").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "URL de base vLLM manquante." };

  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : "/" + path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
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
