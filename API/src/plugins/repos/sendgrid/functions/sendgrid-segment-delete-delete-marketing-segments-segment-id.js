const { utils } = require('./utils');

module.exports = {
  async sendgrid_segment_delete_delete_marketing_segments_segment_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/marketing/segments/{segment_id}";
    const segment_id = String(d.segment_id || '').trim();
    if (!segment_id) return { ok: false, error: 'segment_id requis.' };
    reqPath = reqPath.replace('{segment_id}', encodeURIComponent(segment_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
