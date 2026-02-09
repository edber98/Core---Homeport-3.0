const { utils } = require("./utils");

module.exports = {
  async wc_order_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    const body = {};
    if (d.status) body.status = d.status;
    if (d.meta_data) { try { body.meta_data = typeof d.meta_data === "string" ? JSON.parse(d.meta_data) : d.meta_data; } catch {} }
    const res = await utils.wcRequest(opts, `/orders/${d.orderId}`, { method: "PUT", body });
    if (!res.ok) return res;
    const o = res.data || {};
    return { ok: true, id: String(o.id), number: String(o.number || ""), status: o.status || "", total: o.total || "", currency: o.currency || "", billing_email: (o.billing && o.billing.email) || "", payment_method: o.payment_method || "", date_created: o.date_created || "" };
  }
};
