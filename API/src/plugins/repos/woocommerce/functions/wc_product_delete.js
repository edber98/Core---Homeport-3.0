const { utils } = require("./utils");

module.exports = {
  async wc_product_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const res = await utils.wcRequest(opts, `/products/${d.productId}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: "Produit " + d.productId + " supprimé." };
  }
};
