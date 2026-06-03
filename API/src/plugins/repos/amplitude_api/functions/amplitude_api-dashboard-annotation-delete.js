const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotation_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const annotationId = String(d.annotationId || '').trim();
    if (!annotationId) return { ok: false, error: 'annotationId requis.' };
    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    const res = await utils.providerRequest(opts, `/api/3/annotations/${encodeURIComponent(annotationId)}`, { method: 'DELETE', headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Annotation supprimée.', raw: res.data || null };
  }
};
