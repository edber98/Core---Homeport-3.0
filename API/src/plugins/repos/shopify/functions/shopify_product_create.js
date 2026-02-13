const { utils } = require("./utils");

module.exports = {
  async shopify_product_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.title) return { ok: false, error: "Missing title." };
    const product = { title: d.title };
    if (d.body_html) product.body_html = d.body_html;
    if (d.vendor) product.vendor = d.vendor;
    if (d.product_type) product.product_type = d.product_type;
    if (d.status) product.status = d.status;
    log('Création en cours...');
    const res = await utils.shopifyRequest(opts, "/products.json", { method: "POST", body: { product } });
    if (!res.ok) return res;
    const p = res.data.product || {};
    return { ok: true, id: String(p.id), title: p.title || "", vendor: p.vendor || "", product_type: p.product_type || "", status: p.status || "", handle: p.handle || "", created_at: p.created_at || "" };
  }
};
