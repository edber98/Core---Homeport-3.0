const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotation_create(node, msg, inputs, opts) {
    const d = inputs || {};
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
    if (!body.label) return { ok: false, error: 'label requis.' };
    if (!body.start) return { ok: false, error: 'start requis.' };

    const res = await utils.providerRequest(opts, '/api/3/annotations', { method: 'POST', body, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status, message: 'Annotation créée.', raw: res.data || null };
  }
};
