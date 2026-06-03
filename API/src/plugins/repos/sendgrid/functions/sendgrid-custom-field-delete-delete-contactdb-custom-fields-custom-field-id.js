const { utils } = require('./utils');

module.exports = {
  async sendgrid_custom_field_delete_delete_contactdb_custom_fields_custom_field_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contactdb/custom_fields/{custom_field_id}";
    const custom_field_id = String(d.custom_field_id || '').trim();
    if (!custom_field_id) return { ok: false, error: 'custom_field_id requis.' };
    reqPath = reqPath.replace('{custom_field_id}', encodeURIComponent(custom_field_id));

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
