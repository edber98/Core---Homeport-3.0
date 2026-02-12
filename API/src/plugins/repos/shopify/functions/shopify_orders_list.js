const { utils } = require("./utils");

module.exports = {
  async shopify_orders_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.status) query.status = d.status;
    if (d.since_id) query.since_id = d.since_id;
    const res = await utils.shopifyRequest(opts, "/orders.json", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.orders) || [];
    const orders = items.map(o => ({ id: String(o.id), order_number: String(o.order_number || ""), email: o.email || "", financial_status: o.financial_status || "", fulfillment_status: o.fulfillment_status || "", total_price: o.total_price || "", currency: o.currency || "", created_at: o.created_at || "", customer_id: String((o.customer && o.customer.id) || "") }));
    return { ok: true, orders, totalCount: orders.length };
  }
};
