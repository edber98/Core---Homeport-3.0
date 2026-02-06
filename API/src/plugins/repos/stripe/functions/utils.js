function flattenParams(obj, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "object" && !Array.isArray(value)) {
        Object.assign(result, flattenParams(value, fullKey));
      } else {
        result[fullKey] = String(value);
      }
    }
  }
  return result;
}

async function stripeRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const secretKey = credentials.secretKey;
  if (!secretKey) return { ok: false, error: "Missing Stripe secret key." };

  const url = new URL(`https://api.stripe.com/v1${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = { "Authorization": `Bearer ${secretKey}`, ...(options.headers || {}) };
  const method = options.method || "GET";
  let body;
  if (options.body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(flattenParams(options.body)).toString();
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { stripeRequest, flattenParams } };
