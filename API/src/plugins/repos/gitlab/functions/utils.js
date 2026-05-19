/**
 * GitLab API utility functions
 * Uses PRIVATE-TOKEN header for authentication
 */

/**
 * Generic GitLab API call
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} pathTemplate - URL path with {param} placeholders
 * @param {object} inputs - Compiled args from the node form
 * @param {object} credentials - { baseUrl, token }
 * @param {object} [options] - { pathParams, queryParams, bodyParams }
 * @returns {Promise<{ok: boolean, status: number, data?: any, error?: string}>}
 */
async function gitlabApi(method, pathTemplate, inputs, credentials, options = {}) {
  const { baseUrl, token } = credentials || {};
  if (!baseUrl || !token) throw new Error('GitLab credentials required (baseUrl + token)');

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
  for (const q of queryParams) {
    const val = inputs[q];
    if (val !== undefined && val !== null && val !== '') {
      qs.set(q, String(val));
    }
  }

  const qsStr = qs.toString();
  const base = baseUrl.replace(/\/+$/, '');
  const url = `${base}/api/v4${path}${qsStr ? '?' + qsStr : ''}`;

  // Build fetch options
  const fetchOpts = {
    method,
    headers: {
      'PRIVATE-TOKEN': token,
    },
  };

  // Build body for POST/PUT/PATCH
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

  // Parse response
  let data;
  const ct = String(res.headers.get('content-type') || '');
  try {
    const text = await res.text();
    if (ct.includes('application/json') && text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } else {
      data = text;
    }
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errMsg = typeof data === 'string'
      ? data
      : (data && (data.message || data.error)) || JSON.stringify(data);
    return { ok: false, error: `GitLab API error ${res.status}: ${errMsg}`, status: res.status };
  }

  // Extract pagination headers from GitLab API
  const pagination = {
    total: parseInt(res.headers.get('x-total') || '0', 10) || 0,
    totalPages: parseInt(res.headers.get('x-total-pages') || '0', 10) || 0,
    page: parseInt(res.headers.get('x-page') || '1', 10) || 1,
    perPage: parseInt(res.headers.get('x-per-page') || '20', 10) || 20,
    nextPage: parseInt(res.headers.get('x-next-page') || '0', 10) || 0,
  };

  return { ok: true, status: res.status, data, pagination };
}

module.exports = { gitlabApi, utils: { gitlabApi } };
