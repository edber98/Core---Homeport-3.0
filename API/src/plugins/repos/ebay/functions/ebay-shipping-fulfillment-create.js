const { utils } = require('./utils');

module.exports = {
  async ebay_shipping_fulfillment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/fulfillment/v1/order/{orderId}/shipping_fulfillment";
    const orderid = String(d.orderid || '').trim();
    if (!orderid) return { ok: false, error: 'orderid requis.' };
    reqPath = reqPath.replace('{orderid}', encodeURIComponent(orderid));

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"lineItems","target":"lineItems","type":"json"},{"source":"shippedDate","target":"shippedDate","type":"text"},{"source":"shippingCarrierCode","target":"shippingCarrierCode","type":"text"},{"source":"trackingNumber","target":"trackingNumber","type":"text"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
