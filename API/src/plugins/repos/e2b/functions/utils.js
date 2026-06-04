async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };
  const baseUrl = String(credentials.baseUrl || 'https://api.e2b.app').replace(/\/+$/, '');
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
  if (apiKey) headers['X-API-Key'] = apiKey;
  if (credentials.accessToken) headers['X-Access-Token'] = credentials.accessToken;
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

function parseValue(value, key, type) {
  if (value === undefined || value === null || value === '') return { skip: true };
  if (type === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number)) return { ok: false, error: `Nombre invalide pour ${key}.` };
    return { ok: true, value: number };
  }
  if (type === 'boolean') return { ok: true, value: value === true || String(value).toLowerCase() === 'true' };
  if (type === 'array' || type === 'object') {
    if (typeof value === 'object') return { ok: true, value };
    try { return { ok: true, value: JSON.parse(String(value)) }; }
    catch { return { ok: false, error: `JSON invalide pour ${key}.` }; }
  }
  return { ok: true, value: String(value) };
}

function buildRequestBody(inputs, fields) {
  const body = {};
  for (const field of Array.isArray(fields) ? fields : []) {
    const parsed = parseValue(inputs ? inputs[field.key] : undefined, field.key, field.type || 'string');
    if (parsed && parsed.skip) continue;
    if (!parsed.ok) return { ok: false, error: parsed.error };
    body[field.target || field.key] = parsed.value;
  }
  return { ok: true, body: Object.keys(body).length ? body : undefined };
}

module.exports = { utils: { providerRequest, buildRequestBody } };
