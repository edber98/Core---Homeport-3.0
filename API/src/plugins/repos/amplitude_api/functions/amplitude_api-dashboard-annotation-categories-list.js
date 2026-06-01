const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotation_categories_list(node, msg, inputs, opts) {
    const d = inputs || {};
    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.providerRequest(opts, '/api/3/annotation-categories', { method: 'GET', headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Catégories récupérées.', raw: res.data || null };
  }
};
