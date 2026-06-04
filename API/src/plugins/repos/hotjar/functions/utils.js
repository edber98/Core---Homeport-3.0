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

function asFormData(obj = {}) {
  const fd = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    fd.set(k, String(v));
  });
  return fd.toString();
}

async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = normalizeBase(credentials.baseUrl, 'https://api.hotjar.io');
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);

  const query = parseJsonInput(options.query, 'queryParameters', { defaultValue: {}, allowArray: false }) || {};
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  let headers = parseJsonInput(credentials.defaultHeaders, 'defaultHeaders', { defaultValue: {}, allowArray: false }) || {};
  headers = { Accept: 'application/json', ...headers, ...(options.headers || {}) };

  const method = options.method || 'GET';
  let body = undefined;

  if (path === '/v1/oauth/token') {
    const payload = (options.body && typeof options.body === 'object') ? { ...options.body } : {};
    payload.grant_type = payload.grant_type || 'client_credentials';
    payload.client_id = payload.client_id || credentials.clientId;
    payload.client_secret = payload.client_secret || credentials.clientSecret;
    if (!payload.client_id || !payload.client_secret) return { ok: false, error: 'client_id et client_secret requis pour /v1/oauth/token.' };
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = asFormData(payload);
  } else {
    const token = String(credentials.accessToken || '').trim();
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
    if (options.body !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      body = headers['Content-Type'].includes('application/json') ? JSON.stringify(options.body) : String(options.body);
    }
  }

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
  if (!res.ok) return { ok: false, status: res.status, error: data?.msg || data?.message || data?.error || `HTTP ${res.status}`, details: data };
  return { ok: true, status: res.status, data };
}

module.exports = { utils: { parseJsonInput, providerRequest } };
