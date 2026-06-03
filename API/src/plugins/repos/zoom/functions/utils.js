// Zoom Server-to-Server OAuth2 utilities
// Handles token acquisition and API calls

const BASE_URL = 'https://api.zoom.us/v2';
const TOKEN_URL = 'https://zoom.us/oauth/token';

// In-memory token cache
let _tokenCache = { token: null, expiresAt: 0 };

async function readJsonResponse(res) {
  if (res && typeof res.json === 'function') return res.json();
  const text = res && typeof res.text === 'function' ? await res.text() : '';
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Obtain a Server-to-Server OAuth2 access token.
 * Caches the token until it expires (minus 60s buffer).
 */
async function getAccessToken(credentials) {
  const { accountId, clientId, clientSecret } = credentials || {};
  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials required (accountId + clientId + clientSecret)');
  }

  const now = Date.now();
  if (_tokenCache.token && _tokenCache.expiresAt > now) {
    return _tokenCache.token;
  }

  const url = `${TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Zoom OAuth error ${res.status}: ${text}`);
  }

  const data = await readJsonResponse(res);
  _tokenCache.token = data.access_token;
  // Expire 60s early to avoid edge cases
  _tokenCache.expiresAt = now + (data.expires_in - 60) * 1000;

  return _tokenCache.token;
}

/**
 * Generic Zoom API call.
 * @param {string} method - HTTP method (GET, POST, PATCH, PUT, DELETE)
 * @param {string} pathTemplate - URL path with {param} placeholders
 * @param {object} inputs - Compiled args from the node form
 * @param {object} credentials - { accountId, clientId, clientSecret }
 * @param {object} [options] - { pathParams, queryParams, bodyParams }
 * @returns {Promise<{ok: boolean, status: number, data?: any, error?: string}>}
 */
async function zoomApi(method, pathTemplate, inputs, credentials, options = {}) {
  const token = await getAccessToken(credentials);
  const { pathParams = [], queryParams = [], bodyParams = [] } = options;

  // Build path
  let path = pathTemplate;
  for (const p of pathParams) {
    const val = String(inputs[p] || '').trim();
    if (!val) throw new Error(`${p} is required`);
    path = path.replace(`{${p}}`, encodeURIComponent(val));
  }

  // Build query string
  const qs = new URLSearchParams();
  for (const q of queryParams) {
    const val = inputs[q];
    if (val !== undefined && val !== null && val !== '') {
      qs.set(q, String(val));
    }
  }

  const qsStr = qs.toString();
  const url = `${BASE_URL}${path}${qsStr ? '?' + qsStr : ''}`;

  // Build fetch options
  const fetchOpts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const body = {};
    for (const b of bodyParams) {
      const val = inputs[b];
      if (val !== undefined && val !== null && val !== '') {
        body[b] = val;
      }
    }
    if (Object.keys(body).length > 0) {
      fetchOpts.headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, fetchOpts);

  // Handle 204 No Content (DELETE)
  if (res.status === 204) {
    return { ok: true, status: 204, data: { status: '204', message: 'Deleted successfully' } };
  }

  let data;
  const ct = String(res.headers.get('content-type') || '');
  try {
    if (ct.includes('application/json')) data = await readJsonResponse(res);
    else data = await res.text();
  } catch {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const errMsg = typeof data === 'string'
      ? data
      : (data && data.message) || JSON.stringify(data);
    return { ok: false, error: `Zoom API error ${res.status}: ${errMsg}`, status: res.status };
  }

  return { ok: true, status: res.status, data };
}

module.exports = { utils: { getAccessToken, zoomApi, readJsonResponse } };
