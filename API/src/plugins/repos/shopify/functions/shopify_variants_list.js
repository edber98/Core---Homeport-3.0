const { utils } = require("./utils");

module.exports = {
  async shopify_variants_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const query = {};
    if (d.limit) query.limit = d.limit;
    log('Récupération de la liste...');
    const res = await utils.shopifyRequest(opts, `/products/${d.productId}/variants.json`, { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.variants) || [];
    const variants = items.map(v => ({ id: String(v.id), product_id: String(v.product_id || ""), title: v.title || "", price: v.price || "", sku: v.sku || "", inventory_quantity: v.inventory_quantity || 0 }));
    return { ok: true, variants, totalCount: variants.length };
  }
};
