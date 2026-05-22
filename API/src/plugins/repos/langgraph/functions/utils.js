function parseJsonInput(value, label, options = {}) {
  const { defaultValue = undefined, allowArray = true, allowObject = true } = options;
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'object') {
    if (Array.isArray(value) && !allowArray) throw new Error('JSON invalide dans ' + label + ': tableau non autorise.');
    if (!Array.isArray(value) && (!value || typeof value !== 'object') && allowObject) throw new Error('JSON invalide dans ' + label + ': objet attendu.');
    return value;
  }
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed) && !allowArray) throw new Error('JSON invalide dans ' + label + ': tableau non autorise.');
    if (!Array.isArray(parsed) && (!parsed || typeof parsed !== 'object') && allowObject) throw new Error('JSON invalide dans ' + label + ': objet attendu.');
    return parsed;
  } catch (e) {
    if (/JSON invalide/.test(String(e && e.message))) throw e;
    throw new Error('JSON invalide dans ' + label + '.');
  }
}

function normalizeBase(url, fallback) {
  return String(url || fallback || '').trim().replace(/\/+$/, '');
}

async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = normalizeBase(credentials.baseUrl, 'http://localhost:8124');
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);

  const query = parseJsonInput(options.query, 'query', { defaultValue: {}, allowArray: false }) || {};
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  let headers = parseJsonInput(credentials.defaultHeaders, 'defaultHeaders', { defaultValue: {}, allowArray: false }) || {};
  headers = { ...headers, ...(options.headers || {}) };
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (credentials.apiKey && !headers['X-Api-Key'] && !headers.Authorization) headers['X-Api-Key'] = String(credentials.apiKey).trim();

  const method = options.method || 'GET';
  const body = options.body !== undefined ? JSON.stringify(options.body) : undefined;

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
  if (!res.ok) return { ok: false, status: res.status, error: data?.detail || data?.message || data?.error || `HTTP ${res.status}`, details: data };
  return { ok: true, status: res.status, data };
}

module.exports = { utils: { parseJsonInput, providerRequest } };
