const { utils } = require("./utils");

module.exports = {
  async shopify_product_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const res = await utils.shopifyRequest(opts, `/products/${d.productId}.json`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: "Produit " + d.productId + " supprimé." };
  }
};
