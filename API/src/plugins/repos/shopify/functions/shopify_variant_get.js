const { utils } = require("./utils");

module.exports = {
  async shopify_variant_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.variantId) return { ok: false, error: "Missing variantId." };
    log('Récupération des données...');
    const res = await utils.shopifyRequest(opts, `/variants/${d.variantId}.json`);
    if (!res.ok) return res;
    const v = res.data.variant || {};
    return { ok: true, id: String(v.id), product_id: String(v.product_id || ""), title: v.title || "", price: v.price || "", sku: v.sku || "", inventory_quantity: v.inventory_quantity || 0 };
  }
};
