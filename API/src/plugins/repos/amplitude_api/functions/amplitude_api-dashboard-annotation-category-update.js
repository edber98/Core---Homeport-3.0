const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotation_category_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const categoryId = String(d.categoryId || '').trim();
    if (!categoryId) return { ok: false, error: 'categoryId requis.' };
    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }
    const body = {};
    if (d.category !== undefined && d.category !== null && d.category !== '') body.category = d.category;
    if (!body.category) return { ok: false, error: 'category requis.' };
    const res = await utils.providerRequest(opts, `/api/3/annotation-categories/${encodeURIComponent(categoryId)}`, { method: 'PUT', headers, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Catégorie mise à jour.', raw: res.data || null };
  }
};
