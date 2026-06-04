const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotation_category_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }
    const body = {};
    if (d.category !== undefined && d.category !== null && d.category !== '') body.category = d.category;
    if (!body.category) return { ok: false, error: 'category requis.' };
    const res = await utils.providerRequest(opts, '/api/3/annotation-categories', { method: 'POST', headers, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Catégorie créée.', raw: res.data || null };
  }
};
