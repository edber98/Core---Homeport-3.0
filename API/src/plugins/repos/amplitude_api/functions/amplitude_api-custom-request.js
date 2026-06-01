const { utils } = require('./utils');

module.exports = {
  async amplitude_api_custom_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || 'GET').toUpperCase();
    const path = String(d.path || '').trim();
    if (!path) return { ok: false, error: 'path requis.' };
    let query = {};
    let headers = {};
    let body = undefined;
    try { query = utils.parseJsonInput(d.query, 'query', { defaultValue: {}, allowArray: false }) || {}; } catch (e) { return { ok: false, error: e.message }; }
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; } catch (e) { return { ok: false, error: e.message }; }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else { try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; } }
    }
    const res = await utils.providerRequest(opts, path.startsWith('/') ? path : `/${path}`, { method, query, headers, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Action exécutée.', raw: res.data || null };
  }
};
