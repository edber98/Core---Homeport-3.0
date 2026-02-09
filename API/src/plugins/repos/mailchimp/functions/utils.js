async function mailchimpRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Missing Mailchimp API key." };

  const parts = apiKey.split("-");
  const dc = parts.length > 1 ? parts[parts.length - 1] : "us1";

  const url = new URL(`https://${dc}.api.mailchimp.com/3.0${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
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
    return { ok: false, error: data?.detail || data?.title || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

module.exports = { utils: { mailchimpRequest } };
