const { utils } = require("./utils");

module.exports = {
  async shopify_product_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const res = await utils.shopifyRequest(opts, `/products/${d.productId}.json`);
    if (!res.ok) return res;
    const p = res.data.product || {};
    return { ok: true, id: String(p.id), title: p.title || "", vendor: p.vendor || "", product_type: p.product_type || "", status: p.status || "", handle: p.handle || "", created_at: p.created_at || "" };
  }
};
