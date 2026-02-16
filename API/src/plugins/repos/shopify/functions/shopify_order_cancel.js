const { utils } = require("./utils");

module.exports = {
  async shopify_order_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    const body = {};
    if (d.reason) body.reason = d.reason;
    log('Appel API en cours...');
    const res = await utils.shopifyRequest(opts, `/orders/${d.orderId}/cancel.json`, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, status: "cancelled", message: "Commande " + d.orderId + " annulée." };
  }
};
