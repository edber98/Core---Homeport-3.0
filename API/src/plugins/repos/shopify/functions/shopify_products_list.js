const { utils } = require("./utils");

module.exports = {
  async shopify_products_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.product_type) query.product_type = d.product_type;
    if (d.vendor) query.vendor = d.vendor;
    if (d.since_id) query.since_id = d.since_id;
    log('Récupération de la liste...');
    const res = await utils.shopifyRequest(opts, "/products.json", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.products) || [];
    const products = items.map(p => ({ id: String(p.id), title: p.title || "", vendor: p.vendor || "", product_type: p.product_type || "", status: p.status || "", handle: p.handle || "", created_at: p.created_at || "" }));
    return { ok: true, products, totalCount: products.length };
  }
};
