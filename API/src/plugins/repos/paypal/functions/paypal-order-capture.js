const { utils } = require("./utils");

module.exports = {
  async paypal_order_capture(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const orderId = String(d.orderId || "").trim();
    if (!orderId) return { ok: false, error: "La commande est requise." };

    log("Capture de la commande PayPal...");
    const res = await utils.paypalRequest(opts, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", body: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.mapOrder(res.data || {});
  }
};
