const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotation_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const annotationId = String(d.annotationId || '').trim();
    if (!annotationId) return { ok: false, error: 'annotationId requis.' };
    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }
    const body = {};
    if (d.label !== undefined && d.label !== null && d.label !== '') body.label = d.label;
    if (d.start !== undefined && d.start !== null && d.start !== '') body.start = d.start;
    if (d.category !== undefined && d.category !== null && d.category !== '') body.category = d.category;
    if (d.chart_id !== undefined && d.chart_id !== null && d.chart_id !== '') body.chart_id = d.chart_id;
    if (d.details !== undefined && d.details !== null && d.details !== '') body.details = d.details;
    if (d.end !== undefined && d.end !== null && d.end !== '') body.end = d.end;
    if (!Object.keys(body).length) return { ok: false, error: 'Au moins un champ de mise à jour est requis.' };
    const res = await utils.providerRequest(opts, `/api/3/annotations/${encodeURIComponent(annotationId)}`, { method: 'PUT', headers, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Annotation mise à jour.', raw: res.data || null };
  }
};
