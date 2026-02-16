const { utils } = require("./utils");

module.exports = {
  async shopify_order_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    log('Récupération des données...');
    const res = await utils.shopifyRequest(opts, `/orders/${d.orderId}.json`);
    if (!res.ok) return res;
    const o = res.data.order || {};
    return { ok: true, id: String(o.id), order_number: String(o.order_number || ""), email: o.email || "", financial_status: o.financial_status || "", fulfillment_status: o.fulfillment_status || "", total_price: o.total_price || "", currency: o.currency || "", created_at: o.created_at || "", customer_id: String((o.customer && o.customer.id) || "") };
  }
};
