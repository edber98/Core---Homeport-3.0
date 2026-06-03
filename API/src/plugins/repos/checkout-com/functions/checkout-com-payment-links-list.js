const { utils } = require('./utils');

module.exports = {
  async checkout_com_payment_links_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = utils.toInt(d.limit, 25);
    if (d.reference) query.reference = String(d.reference);

    const res = await utils.checkoutRequest(opts, '/payment-links', { method: 'GET', query });
    if (!res.ok) return res;

    const data = res.data || {};
    const items = Array.isArray(data.data) ? data.data : (Array.isArray(data.items) ? data.items : []);
    const out = items.map(utils.compactPaymentLink);
    return { ok: true, totalCount: out.length, items: out };
  }
};
