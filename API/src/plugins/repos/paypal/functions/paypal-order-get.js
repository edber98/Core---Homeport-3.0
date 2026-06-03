const { utils } = require("./utils");

module.exports = {
  async paypal_order_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const orderId = String(d.orderId || "").trim();
    if (!orderId) return { ok: false, error: "La commande est requise." };

    const res = await utils.paypalRequest(opts, `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.mapOrder(res.data || {});
  }
};
