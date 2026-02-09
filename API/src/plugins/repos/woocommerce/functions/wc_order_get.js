const { utils } = require("./utils");

module.exports = {
  async wc_order_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    const res = await utils.wcRequest(opts, `/orders/${d.orderId}`);
    if (!res.ok) return res;
    const o = res.data || {};
    return { ok: true, id: String(o.id), number: String(o.number || ""), status: o.status || "", total: o.total || "", currency: o.currency || "", billing_email: (o.billing && o.billing.email) || "", payment_method: o.payment_method || "", date_created: o.date_created || "" };
  }
};
