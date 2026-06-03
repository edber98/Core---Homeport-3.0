const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotation_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const annotationId = String(d.annotationId || '').trim();
    if (!annotationId) return { ok: false, error: 'annotationId requis.' };
    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }
    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }
    if (!body || typeof body !== 'object') return { ok: false, error: 'body requis.' };
    const res = await utils.providerRequest(opts, `/api/3/annotations/${encodeURIComponent(annotationId)}`, { method: 'PATCH', headers, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Annotation mise à jour.', raw: res.data || null };
  }
};
