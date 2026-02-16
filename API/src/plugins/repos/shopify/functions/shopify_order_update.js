const { utils } = require("./utils");

module.exports = {
  async shopify_order_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    const order = {};
    if (d.email) order.email = d.email;
    if (d.note) order.note = d.note;
    if (d.tags) order.tags = d.tags;
    log('Mise à jour en cours...');
    const res = await utils.shopifyRequest(opts, `/orders/${d.orderId}.json`, { method: "PUT", body: { order } });
    if (!res.ok) return res;
    const o = res.data.order || {};
    return { ok: true, id: String(o.id), order_number: String(o.order_number || ""), email: o.email || "", financial_status: o.financial_status || "", fulfillment_status: o.fulfillment_status || "", total_price: o.total_price || "", currency: o.currency || "", created_at: o.created_at || "", customer_id: String((o.customer && o.customer.id) || "") };
  }
};
