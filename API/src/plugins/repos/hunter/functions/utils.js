async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };
  const baseUrl = String(credentials.baseUrl || 'https://api.hunter.io').replace(/\/+$/, '');
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
  if (apiKey) { headers['X-API-KEY'] = apiKey; url.searchParams.set('api_key', apiKey); }
  
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

function parseBodyValue(value, type, label) {
  if (value === undefined || value === null || value === '') return { present: false };
  if (type === 'number') { const n = Number(value); return Number.isFinite(n) ? { present: true, value: n } : { present: false }; }
  if (type === 'json') { if (typeof value === 'object') return { present: true, value }; try { return { present: true, value: JSON.parse(String(value)) }; } catch { return { error: 'JSON invalide dans ' + label + '.' }; } }
  return { present: true, value: String(value) };
}
function buildBodyFromInputs(inputs, defs) {
  const body = {};
  for (const def of defs || []) {
    const parsed = parseBodyValue(inputs[def.source], def.type, def.source);
    if (parsed.error) return { __invalid: parsed.error };
    if (!parsed.present) continue;
    body[def.target || def.source] = parsed.value;
  }
  return Object.keys(body).length ? body : undefined;
}
module.exports = { utils: { providerRequest, buildBodyFromInputs } };
