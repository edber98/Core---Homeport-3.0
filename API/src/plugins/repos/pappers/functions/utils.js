/**
 * Pappers API v2 utility functions
 * Uses api-key header for authentication
 * All endpoints are GET requests
 */

/**
 * Generic Pappers API call
 * @param {string} path - URL path (e.g. /entreprise, /recherche)
 * @param {object} inputs - Compiled args from the node form
 * @param {object} credentials - { apiToken }
 * @param {object} [options] - { queryParams: string[], responseType: 'json'|'buffer' }
 * @returns {Promise<{ok: boolean, status: number, data?: any, error?: string}>}
 */
async function pappersApi(path, inputs, credentials, options = {}) {
  const { apiToken } = credentials || {};
  if (!apiToken) throw new Error('Pappers credentials required (apiToken)');

  const { queryParams = [], responseType = 'json' } = options;

  // Build query string from inputs
  const qs = new URLSearchParams();
  for (const q of queryParams) {
    const val = inputs[q];
    if (val !== undefined && val !== null && val !== '') {
      qs.set(q, String(val));
    }
  }

  const qsStr = qs.toString();
  const url = `https://api.pappers.fr/v2${path}${qsStr ? '?' + qsStr : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'api-key': apiToken },
  });

  if (!res.ok) {
    let errMsg;
    try {
      const errData = await res.json();
      errMsg = errData.message || errData.error || JSON.stringify(errData);
    } catch {
      errMsg = await res.text().catch(() => `HTTP ${res.status}`);
    }
    return { ok: false, error: `Pappers API error ${res.status}: ${errMsg}`, status: res.status };
  }

  if (responseType === 'buffer') {
    const buffer = Buffer.from(await res.arrayBuffer());
    return { ok: true, status: res.status, data: buffer };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text().catch(() => null);
  }

  return { ok: true, status: res.status, data };
}

module.exports = { pappersApi };
