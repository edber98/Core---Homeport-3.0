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

function parseBodyValue(value, type, label) {
  if (value === undefined || value === null || value === '') return { present: false };
  if (type === 'checkbox') return { present: true, value: Boolean(value) };
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? { present: true, value: n } : { present: false };
  }
  if (type === 'json') {
    if (typeof value === 'object') return { present: true, value };
    try { return { present: true, value: JSON.parse(String(value)) }; }
    catch { return { error: 'JSON invalide dans ' + label + '.' }; }
  }
  return { present: true, value: String(value) };
}

function buildBodyFromInputs(inputs, fields) {
  const body = {};
  for (const field of fields || []) {
    const parsed = parseBodyValue(inputs[field.source], field.type, field.source);
    if (parsed.error) return { __invalid: parsed.error };
    if (!parsed.present) continue;
    body[field.target || field.source] = parsed.value;
  }
  return Object.keys(body).length ? body : undefined;
}

module.exports = { utils: { providerRequest, buildBodyFromInputs } };
