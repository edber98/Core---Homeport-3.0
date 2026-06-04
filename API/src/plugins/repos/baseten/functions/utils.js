async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };
  const baseUrl = String(credentials.baseUrl || 'https://api.baseten.co').replace(/\/+$/, '');
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
  if (apiKey) headers['Authorization'] = `Api-Key ${apiKey}`;
  
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

function buildRequestBody(inputs, fields) {
  const body = {};
  let hasValue = false;
  for (const field of fields || []) {
    const key = field.key;
    let value = inputs ? inputs[key] : undefined;
    if (value === undefined || value === null || value === '') continue;

    if ((field.type === 'object' || field.type === 'array') && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return { ok: false, error: `JSON invalide pour ${key}.` };
      }
    } else if ((field.type === 'integer' || field.type === 'number') && typeof value !== 'number') {
      value = Number(value);
      if (Number.isNaN(value)) return { ok: false, error: `Nombre invalide pour ${key}.` };
    } else if (field.type === 'boolean' && typeof value !== 'boolean') {
      value = String(value).toLowerCase() === 'true';
    }

    body[key] = value;
    hasValue = true;
  }
  return { ok: true, body: hasValue ? body : undefined };
}

module.exports = { utils: { providerRequest, buildRequestBody } };
