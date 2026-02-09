async function psRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const storeUrl = credentials.storeUrl;
  const apiKey = credentials.apiKey;
  if (!storeUrl) return { ok: false, error: "Missing PrestaShop store URL." };
  if (!apiKey) return { ok: false, error: "Missing PrestaShop API key." };

  const base = storeUrl.replace(/\/+$/, "") + "/api";
  const url = new URL(`${base}${path}`);
  url.searchParams.set("output_format", "JSON");
  if (!options.skipDisplay) url.searchParams.set("display", "full");
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const headers = { "Authorization": `Basic ${auth}`, ...(options.headers || {}) };
  const method = options.method || "GET";
  let body;
  if (options.body) {
    headers["Content-Type"] = "application/json";
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
    return { ok: false, error: (data && data.errors && data.errors[0] && data.errors[0].message) || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

function psLangValue(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (Array.isArray(field)) return (field[0] && field[0].value) || "";
  if (field.value) return field.value;
  return String(field);
}

module.exports = { utils: { psRequest, psLangValue } };
