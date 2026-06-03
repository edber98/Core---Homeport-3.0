// Trello API handler functions
// All functions share a common pattern: build URL, add auth, call API, return result

const BASE_URL = 'https://api.trello.com/1';

/**
 * Generic Trello API call
 * @param {string} method - HTTP method
 * @param {string} pathTemplate - URL path with {param} placeholders
 * @param {object} inputs - Compiled args from the node form
 * @param {object} credentials - { apiKey, apiToken }
 * @param {object} [options] - { pathParams: [...], queryParams: [...], bodyParams: [...] }
 */
async function trelloApi(method, pathTemplate, inputs, credentials, options = {}) {
  const { apiKey, apiToken } = credentials || {};
  if (!apiKey || !apiToken) throw new Error('Trello credentials required (apiKey + apiToken)');

  const { pathParams = [], queryParams = [], bodyParams = [] } = options;

  // Build path by replacing {param} with input values
  let path = pathTemplate;
  for (const p of pathParams) {
    const val = String(inputs[p] || '').trim();
    if (!val) throw new Error(`${p} is required`);
    path = path.replace(`{${p}}`, encodeURIComponent(val));
  }

  // Build query string
  const qs = new URLSearchParams();
  qs.set('key', apiKey);
  qs.set('token', apiToken);
  for (const q of queryParams) {
    const val = inputs[q];
    if (val !== undefined && val !== null && val !== '') {
      qs.set(q, String(val));
    }
  }

  const url = `${BASE_URL}${path}?${qs.toString()}`;

  // Build body for POST/PUT
  const fetchOpts = { method, headers: {} };
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
  let data;
  const ct = String(res.headers.get('content-type') || '');
  try {
    if (ct.includes('application/json')) data = await res.json();
    else data = await res.text();
  } catch { data = await res.text().catch(() => null); }

  if (!res.ok) {
    const errMsg = typeof data === 'string' ? data : (data && data.message) || JSON.stringify(data);
    return { ok: false, error: `Trello API error ${res.status}: ${errMsg}`, status: res.status };
  }

  return { ok: true, status: res.status, data };
}

// ============================================================
// BOARDS
// ============================================================

module.exports = { utils: { trelloApi } };
