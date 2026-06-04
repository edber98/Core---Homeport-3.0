async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };

  const baseUrl = String(credentials.baseUrl || 'https://api.example.com').replace(/\/+$/, '');
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || 'GET',
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

function parseStructuredValue(value, key, type) {
  if (value === undefined || value === null || value === '') return { skip: true };
  if (type === 'number') {
    const number = Number(value);
    if (Number.isNaN(number)) return { ok: false, error: `Nombre invalide pour ${key}.` };
    return { ok: true, value: number };
  }
  if (type === 'boolean') return { ok: true, value: value === true || String(value).toLowerCase() === 'true' };
  if (type === 'array' || type === 'object') {
    if (typeof value === 'object') return { ok: true, value };
    try { return { ok: true, value: JSON.parse(String(value)) }; }
    catch { return { ok: false, error: `JSON invalide pour ${key}.` }; }
  }
  return { ok: true, value };
}

function buildRequestBody(inputs, fields) {
  const body = {};
  for (const field of Array.isArray(fields) ? fields : []) {
    const parsed = parseStructuredValue(inputs ? inputs[field.key] : undefined, field.key, field.type || 'string');
    if (parsed && parsed.skip) continue;
    if (!parsed.ok) return { ok: false, error: parsed.error };
    body[field.target || field.key] = parsed.value;
  }
  return { ok: true, body: Object.keys(body).length ? body : undefined };
}

module.exports = { utils: { providerRequest, buildRequestBody } };
