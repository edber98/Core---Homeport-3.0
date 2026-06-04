async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };
  const baseUrl = String(credentials.baseUrl || 'https://company.clearbit.com').replace(/\/+$/, '');
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
  if (apiKey) {
    const authType = String(credentials.authType || 'basic').toLowerCase();
    if (authType === 'bearer') headers['Authorization'] = `Bearer ${apiKey}`;
    else headers['Authorization'] = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }
  
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

function buildObjectFromFields(rows) {
  const object = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row && row.fieldKey || '').trim();
    if (!key) continue;
    let value = row.fieldValue;
    switch (row.fieldType || 'string') {
      case 'number': value = Number(value); if (Number.isNaN(value)) return { ok: false, error: `Nombre invalide pour ${key}.` }; break;
      case 'boolean': value = value === true || String(value).toLowerCase() === 'true'; break;
      case 'json': try { value = JSON.parse(String(value || 'null')); } catch { return { ok: false, error: `JSON invalide pour ${key}.` }; } break;
      case 'null': value = null; break;
      default: value = value == null ? '' : String(value);
    }
    object[key] = value;
  }
  return { ok: true, object: Object.keys(object).length ? object : undefined };
}

module.exports = { utils: { providerRequest, buildObjectFromFields } };
