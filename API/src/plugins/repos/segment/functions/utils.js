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

function isPublicPath(path) {
  return path.startsWith('/sources') || path.startsWith('/destinations');
}

function basic(username, password) {
  return Buffer.from(`${String(username || '')}:${String(password || '')}`).toString('base64');
}

async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const usePublic = isPublicPath(path);
  const baseUrl = usePublic
    ? normalizeBase(credentials.publicApiBaseUrl, 'https://api.segmentapis.com')
    : normalizeBase(credentials.trackingBaseUrl, 'https://api.segment.io/v1');

  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);
  const query = parseJsonInput(options.query, 'query', { defaultValue: {}, allowArray: false }) || {};
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  let headers = parseJsonInput(credentials.defaultHeaders, 'defaultHeaders', { defaultValue: {}, allowArray: false }) || {};
  headers = { Accept: 'application/json', ...headers, ...(options.headers || {}) };

  if (usePublic) {
    const token = String(credentials.publicApiToken || '').trim();
    if (!token && !headers.Authorization) return { ok: false, error: 'Public API Token Segment manquant.' };
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  } else {
    const writeKey = String(credentials.writeKey || '').trim();
    if (!writeKey && !headers.Authorization) return { ok: false, error: 'Write Key Segment manquant.' };
    if (writeKey && !headers.Authorization) headers.Authorization = `Basic ${basic(writeKey, '')}`;
  }

  const method = options.method || 'GET';
  let body = undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const payload = options.body;
    if (!usePublic && headers['Content-Type'].includes('application/json') && payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if (!payload.writeKey && credentials.writeKey) payload.writeKey = credentials.writeKey;
    }
    body = headers['Content-Type'].includes('application/json') ? JSON.stringify(payload) : String(payload);
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
