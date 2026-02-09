const { utils } = require("./utils");

module.exports = {
  async shopify_order_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.email) return { ok: false, error: "Missing email." };
    const order = { email: d.email };
    if (d.line_items) { try { order.line_items = typeof d.line_items === "string" ? JSON.parse(d.line_items) : d.line_items; } catch {} }
    if (d.financial_status) order.financial_status = d.financial_status;
    const res = await utils.shopifyRequest(opts, "/orders.json", { method: "POST", body: { order } });
    if (!res.ok) return res;
    const o = res.data.order || {};
    return { ok: true, id: String(o.id), order_number: String(o.order_number || ""), email: o.email || "", financial_status: o.financial_status || "", fulfillment_status: o.fulfillment_status || "", total_price: o.total_price || "", currency: o.currency || "", created_at: o.created_at || "", customer_id: String((o.customer && o.customer.id) || "") };
  }
};
