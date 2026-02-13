const { utils } = require("./utils");

module.exports = {
  async wc_product_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    log('Suppression en cours...');
    const res = await utils.wcRequest(opts, `/products/${d.productId}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: "Produit " + d.productId + " supprimé." };
  }
};
