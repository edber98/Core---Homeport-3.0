async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };

  const baseUrl = String(credentials.baseUrl || 'https://api.webflow.com/v2').replace(/\/+$/, '');
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    ...(options.formData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.formData || (options.body ? JSON.stringify(options.body) : undefined)
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

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function setNestedValue(target, path, value) {
  if (!Array.isArray(path) || !path.length) return;
  let cursor = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    if (!isPlainObject(cursor[segment])) cursor[segment] = {};
    cursor = cursor[segment];
  }
  cursor[path[path.length - 1]] = value;
}

function coerceFieldValue(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const type = String(field?.type || 'text');
  const key = field?.key || 'champ';

  if (type === 'json') {
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(String(value));
    } catch {
      throw new Error(`JSON invalide dans ${key}.`);
    }
  }

  if (type === 'checkbox') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'oui'].includes(normalized)) return true;
      if (['false', '0', 'no', 'non'].includes(normalized)) return false;
    }
    return !!value;
  }

  if (type === 'number') {
    if (typeof value === 'number') return value;
    const num = Number(value);
    if (Number.isNaN(num)) throw new Error(`Nombre invalide dans ${key}.`);
    return num;
  }

  return value;
}

function buildBodyFromFields(inputs, fields) {
  const body = {};
  for (const field of fields || []) {
    const rawValue = inputs ? inputs[field.key] : undefined;
    const value = coerceFieldValue(rawValue, field);
    if (value === undefined) continue;
    setNestedValue(body, field.bodyPath || [field.key], value);
  }
  return Object.keys(body).length ? body : undefined;
}

module.exports = { utils: { buildBodyFromFields, providerRequest } };
