const BASE_URLS = {
  sandbox: 'https://api-sandbox.yousign.app/v3',
  production: 'https://api.yousign.app/v3',
};

async function yousignRequest(opts, method, path, body, extra = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API Yousign manquante.' };

  const env = String(credentials.environment || 'sandbox').toLowerCase();
  const baseUrl = BASE_URLS[env] || BASE_URLS.sandbox;
  const url = `${baseUrl}${path}`;

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
  };
  if (!extra.multipart) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOpts = { method, headers };
  if (body && !extra.multipart) {
    fetchOpts.body = JSON.stringify(body);
  } else if (extra.multipart) {
    // For file uploads, body is already a FormData-like object or Buffer
    fetchOpts.body = body;
    // Remove Content-Type so fetch sets it with boundary for FormData
    delete headers['Content-Type'];
  }

  let res;
  try {
    res = await fetch(url, fetchOpts);
  } catch (e) {
    return { ok: false, error: `Erreur réseau: ${e.message}` };
  }

  // Handle 204 No Content (delete)
  if (res.status === 204) {
    return { ok: true };
  }

  const text = await res.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { json = text; }
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    if (json && typeof json === 'object') {
      if (json.detail) errMsg = json.detail;
      else if (json.message) errMsg = json.message;
      else if (json.violations && json.violations.length) {
        errMsg = json.violations.map(v => `${v.propertyPath}: ${v.message}`).join('; ');
      }
    }
    return { ok: false, error: errMsg, status: res.status, details: json };
  }

  return { ok: true, data: json };
}

function buildQueryString(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

module.exports = { utils: { yousignRequest, buildQueryString, BASE_URLS } };
