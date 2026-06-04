const { utils } = require('./utils');

module.exports = {
  async ebay_fulfillment_order_issue_refund(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/fulfillment/v1/order/{order_id}/issue_refund";
    const order_id = String(d.order_id || '').trim();
    if (!order_id) return { ok: false, error: 'order_id requis.' };
    reqPath = reqPath.replace('{order_id}', encodeURIComponent(order_id));

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"reasonForRefund","target":"reasonForRefund","type":"text"},{"source":"comment","target":"comment","type":"text"},{"source":"refundItems","target":"refundItems","type":"json"},{"source":"orderLevelRefundAmount","target":"orderLevelRefundAmount","type":"json"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

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
