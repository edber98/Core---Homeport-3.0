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

function isIngestionPath(path) {
  return path === '/2/httpapi' || path === '/identify' || path === '/groupidentify';
}

function asFormData(obj = {}) {
  const fd = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'object') fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  return fd.toString();
}

function basic(apiKey, secretKey) {
  return Buffer.from(`${String(apiKey || '')}:${String(secretKey || '')}`).toString('base64');
}

async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const method = (options.method || 'GET').toUpperCase();
  const ingestBase = normalizeBase(credentials.ingestBaseUrl, 'https://api2.amplitude.com');
  const analyticsBase = normalizeBase(credentials.analyticsBaseUrl, 'https://amplitude.com');
  const aliasBase = normalizeBase(credentials.aliasBaseUrl, 'https://api.amplitude.com');
  const baseUrl = path === '/usermap' ? aliasBase : (isIngestionPath(path) ? ingestBase : analyticsBase);
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);

  const query = parseJsonInput(options.query, 'query', { defaultValue: {}, allowArray: false }) || {};
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  let headers = parseJsonInput(credentials.defaultHeaders, 'defaultHeaders', { defaultValue: {}, allowArray: false }) || {};
  headers = { Accept: 'application/json', ...headers, ...(options.headers || {}) };

  let body = undefined;
  const payload = options.body;

  if (isIngestionPath(path) && path !== '/2/httpapi') {
    const data = (payload && typeof payload === 'object') ? { ...payload } : {};
    if (!data.api_key && credentials.apiKey) data.api_key = credentials.apiKey;
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = asFormData(data);
  } else if (path === '/2/httpapi') {
    const data = (payload && typeof payload === 'object') ? { ...payload } : {};
    if (!data.api_key && credentials.apiKey) data.api_key = credentials.apiKey;
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  } else {
    if (credentials.apiKey && credentials.secretKey && !headers.Authorization) {
      headers.Authorization = 'Basic ' + basic(credentials.apiKey, credentials.secretKey);
    }
    if (payload !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      body = headers['Content-Type'].includes('application/json') ? JSON.stringify(payload) : String(payload);
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
  if (!res.ok) return { ok: false, status: res.status, error: data?.error || data?.message || data?.detail || `HTTP ${res.status}`, details: data };
  return { ok: true, status: res.status, data };
}

module.exports = { utils: { parseJsonInput, providerRequest } };
