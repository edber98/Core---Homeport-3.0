const { utils } = require('./utils');

module.exports = {
  async crewai_api_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || 'GET').toUpperCase();
    const path = String(d.path || '').trim();
    if (!path) return { ok: false, error: 'Path requis.' };

    let query = {};
    let body;
    try {
      query = d.queryParametersJson ? (typeof d.queryParametersJson === 'object' ? d.queryParametersJson : JSON.parse(String(d.queryParametersJson))) : {};
      body = d.requestBodyJson === undefined || d.requestBodyJson === null || d.requestBodyJson === '' ? undefined : (typeof d.requestBodyJson === 'object' ? d.requestBodyJson : JSON.parse(String(d.requestBodyJson)));
    } catch {
      return { ok: false, error: 'JSON invalide dans query ou body.' };
    }

    const reqPath = path.startsWith('/') ? path : `/${path}`;
    const res = await utils.providerRequest(opts, reqPath, { method, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
