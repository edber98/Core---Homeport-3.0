const { utils } = require("./utils");

module.exports = {
  async shopify_products_count(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.product_type) query.product_type = d.product_type;
    if (d.vendor) query.vendor = d.vendor;
    log('Appel API en cours...');
    const res = await utils.shopifyRequest(opts, "/products/count.json", { query });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: String((res.data && res.data.count) || 0) };
  }
};
