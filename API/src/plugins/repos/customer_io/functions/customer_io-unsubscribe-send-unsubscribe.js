const { utils } = require('./utils');

module.exports = {
  async customer_io_unsubscribe_send_unsubscribe(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/unsubscribe/{delivery_id}";
    const delivery_id = String(d.delivery_id || '').trim();
    if (!delivery_id) return { ok: false, error: 'delivery_id requis.' };
    reqPath = reqPath.replace('{delivery_id}', encodeURIComponent(delivery_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"unsubscribe","target":"unsubscribe","type":"boolean"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
