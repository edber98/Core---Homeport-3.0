async function wcRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const storeUrl = credentials.storeUrl;
  const consumerKey = credentials.consumerKey;
  const consumerSecret = credentials.consumerSecret;
  if (!storeUrl) return { ok: false, error: "Missing WooCommerce store URL." };
  if (!consumerKey) return { ok: false, error: "Missing WooCommerce consumer key." };
  if (!consumerSecret) return { ok: false, error: "Missing WooCommerce consumer secret." };

  const base = storeUrl.replace(/\/+$/, "") + "/wp-json/wc/v3";
  const url = new URL(`${base}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const headers = { "Authorization": `Basic ${auth}`, "Content-Type": "application/json", ...(options.headers || {}) };
  const method = options.method || "GET";
  let body;
  if (options.body) {
    body = JSON.stringify(options.body);
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
    return { ok: false, error: data?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { wcRequest } };
