const { utils } = require("./utils");

module.exports = {
  async wc_product_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.regular_price) body.regular_price = d.regular_price;
    if (d.description) body.description = d.description;
    if (d.sku) body.sku = d.sku;
    if (d.status) body.status = d.status;
    const res = await utils.wcRequest(opts, `/products/${d.productId}`, { method: "PUT", body });
    if (!res.ok) return res;
    const p = res.data || {};
    return { ok: true, id: String(p.id), name: p.name || "", type: p.type || "", status: p.status || "", price: p.price || "", sku: p.sku || "", stock_quantity: p.stock_quantity || 0, date_created: p.date_created || "" };
  }
};
