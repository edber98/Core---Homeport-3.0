// Simple HTTP client function using global fetch (Node >=18)
// Exposed key must match node template key: 'http'
module.exports = {
  async http(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const args = (inputs) || {};
    const method = String(args.method || 'GET').toUpperCase();
    const url = String(args.url || '').trim();
    if (!url) throw new Error('http.url is required');
    let headers = {};
    try { headers = args.requestHeaders ? JSON.parse(args.requestHeaders) : {}; } catch { headers = {}; }
    let body;
    if (['POST','PUT','PATCH','DELETE'].includes(method)) {
      if (args.requestBody && typeof args.requestBody === 'string' && args.requestBody.trim().startsWith('{')) {
        body = args.requestBody;
        headers['content-type'] = headers['content-type'] || 'application/json';
      } else if (args.requestBody && typeof args.requestBody === 'string') {
        body = args.requestBody;
      } else if (args.requestBody && typeof args.requestBody === 'object') {
        body = JSON.stringify(args.requestBody);
        headers['content-type'] = headers['content-type'] || 'application/json';
      }
    }
    log('Appel API en cours...');
    const res = await fetch(url, { method, headers, body });
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    let data;
    try {
      if (ct.includes('application/json')) data = await res.json();
      else data = await res.text();
    } catch { data = await res.text().catch(()=>null); }
    const responseHeaders = res.headers && typeof res.headers.entries === 'function'
      ? Object.fromEntries(res.headers.entries())
      : {};
    return { status: res.status, ok: res.ok, headers: responseHeaders, data };
  }
};
