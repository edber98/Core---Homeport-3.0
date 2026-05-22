function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

async function providerRequest(opts, targetUrl, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const urlText = String(targetUrl || "").trim();
  if (!urlText) return { ok: false, error: "URL endpoint requise." };

  let url;
  try {
    url = new URL(urlText);
  } catch {
    return { ok: false, error: "URL endpoint invalide." };
  }

  if (options.query && typeof options.query === "object") {
    for (const [key, value] of Object.entries(options.query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== "") url.searchParams.append(key, String(item));
        }
      } else if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = { ...(options.headers || {}) };
  if (credentials.modalKey) headers["Modal-Key"] = String(credentials.modalKey);
  if (credentials.modalSecret) headers["Modal-Secret"] = String(credentials.modalSecret);
  if (credentials.bearerToken) headers.Authorization = `Bearer ${credentials.bearerToken}`;

  let body;
  if (options.body !== undefined && options.body !== null && options.body !== "") {
    if (typeof options.body === "string") {
      body = options.body;
      if (!headers["Content-Type"]) headers["Content-Type"] = "text/plain";
    } else {
      body = JSON.stringify(options.body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }
  }

  let res;
  try {
    res = await fetch(url, {
      method: String(options.method || "POST").toUpperCase(),
      headers,
      body
    });
  } catch (e) {
    return { ok: false, error: e.message };
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
      error: (data && (data.message || data.error)) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

module.exports = { utils: { parseJsonInput, providerRequest } };
