async function supaRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { projectUrl, apiKey, serviceRoleKey } = credentials;
  if (!projectUrl || !apiKey) return { ok: false, error: "Missing Supabase project URL or API key." };

  const baseUrl = projectUrl.replace(/\/$/, "");
  const url = `${baseUrl}${path}`;
  const token = serviceRoleKey || apiKey;

  const headers = {
    "apikey": apiKey,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Prefer": options.prefer || "return=representation",
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (options.rawResponse) {
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
    }
    const buffer = await res.arrayBuffer();
    return { ok: true, data: Buffer.from(buffer).toString("base64"), contentType: res.headers.get("content-type") };
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = data?.message || data?.error || data?.error_description || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data, status: res.status };
}

async function supaAuth(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { projectUrl, apiKey, serviceRoleKey } = credentials;
  if (!projectUrl) return { ok: false, error: "Missing Supabase project URL." };

  const baseUrl = projectUrl.replace(/\/$/, "");
  const url = `${baseUrl}/auth/v1${path}`;
  const token = serviceRoleKey || apiKey;

  const headers = {
    "apikey": apiKey,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

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
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = data?.message || data?.msg || data?.error_description || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data };
}

async function supaStorage(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { projectUrl, apiKey, serviceRoleKey } = credentials;
  if (!projectUrl) return { ok: false, error: "Missing Supabase project URL." };

  const baseUrl = projectUrl.replace(/\/$/, "");
  const url = `${baseUrl}/storage/v1${path}`;
  const token = serviceRoleKey || apiKey;

  const headers = {
    "apikey": apiKey,
    "Authorization": `Bearer ${token}`,
    ...(options.headers || {})
  };
  if (!options.rawBody) headers["Content-Type"] = options.contentType || "application/json";

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body || undefined
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (options.rawResponse) {
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
    }
    const buffer = await res.arrayBuffer();
    return { ok: true, data: Buffer.from(buffer).toString("base64"), contentType: res.headers.get("content-type") };
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, details: data };
  }

  return { ok: true, data };
}

module.exports = { utils: { supaRequest, supaAuth, supaStorage } };
