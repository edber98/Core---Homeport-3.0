const { utils } = require("./utils");

module.exports = {
  async wc_order_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    log('Suppression en cours...');
    const res = await utils.wcRequest(opts, `/orders/${d.orderId}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: "Commande " + d.orderId + " supprimée." };
  }
};
