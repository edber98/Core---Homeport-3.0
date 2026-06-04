async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };
  const baseUrl = String(credentials.baseUrl || 'https://nubela.co').replace(/\/+$/, '');
  const pathValue = String(path || '/');
  const url = /^https?:\/\//i.test(pathValue)
    ? new URL(pathValue)
    : new URL(`${baseUrl}${pathValue.startsWith('/') ? pathValue : '/' + pathValue}`);

  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    ...(options.headers || {})
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  
  const method = options.method || 'GET';
  const hasBody = options.body !== undefined && options.body !== null;
  const body = hasBody
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : undefined;

  if (hasBody && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  let data = null;
  if (contentType.includes('application/json')) {
    try { data = await res.json(); } catch { data = null; }
  } else if (contentType.startsWith('image/') || contentType.includes('application/octet-stream')) {
    const arr = await res.arrayBuffer();
    data = {
      contentType,
      base64: Buffer.from(arr).toString('base64')
    };
  } else {
    const text = await res.text();
    data = text || null;
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

function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function bodyFromFields(inputs, fields, jsonFields = []) {
  const d = inputs || {};
  const out = {};
  for (const key of fields) {
    const value = d[key];
    if (value === undefined || value === null || value === '') continue;
    out[key] = jsonFields.includes(key) ? parseJsonInput(value, key, undefined) : value;
  }
  return Object.keys(out).length ? out : undefined;
}

module.exports = { utils: { providerRequest, parseJsonInput, bodyFromFields } };
