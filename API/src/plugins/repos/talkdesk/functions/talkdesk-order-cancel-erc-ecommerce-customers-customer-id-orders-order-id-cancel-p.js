const { utils } = require('./utils');

module.exports = {
  async talkdesk_order_cancel_erc_ecommerce_customers_customer_id_orders_order_id_cancel_p(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/erc/ecommerce/customers/{customer_id}/orders/{order_id}/cancel";
    const customer_id = String(d.customer_id || '').trim();
    if (!customer_id) return { ok: false, error: 'customer_id requis.' };
    reqPath = reqPath.replace('{customer_id}', encodeURIComponent(customer_id));
    const order_id = String(d.order_id || '').trim();
    if (!order_id) return { ok: false, error: 'order_id requis.' };
    reqPath = reqPath.replace('{order_id}', encodeURIComponent(order_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

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
