const { utils } = require("./utils");

module.exports = {
  async shopify_order_close(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    const res = await utils.shopifyRequest(opts, `/orders/${d.orderId}/close.json`, { method: "POST" });
    if (!res.ok) return res;
    return { ok: true, status: "closed", message: "Commande " + d.orderId + " fermée." };
  }
};
