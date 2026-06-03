const { utils } = require('./utils');

module.exports = {
  async customer_io_suppression_delete_deletesuppression(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/esp/suppression/{suppression_type}/{email_address}";
    const suppression_type = String(d.suppression_type || '').trim();
    if (!suppression_type) return { ok: false, error: 'suppression_type requis.' };
    reqPath = reqPath.replace('{suppression_type}', encodeURIComponent(suppression_type));
    const email_address = String(d.email_address || '').trim();
    if (!email_address) return { ok: false, error: 'email_address requis.' };
    reqPath = reqPath.replace('{email_address}', encodeURIComponent(email_address));

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
