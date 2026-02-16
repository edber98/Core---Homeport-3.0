async function shopifyRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.accessToken;
  const shop = credentials.shop;
  if (!accessToken) return { ok: false, error: "Missing Shopify access token." };
  if (!shop) return { ok: false, error: "Missing Shopify shop domain." };

  const base = `https://${shop}.myshopify.com/admin/api/2024-01`;
  const url = new URL(`${base}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json", ...(options.headers || {}) };
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
    return { ok: false, error: data?.errors || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { shopifyRequest } };
