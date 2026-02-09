const { utils } = require("./utils");

module.exports = {
  async wc_product_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };
    const body = { name: d.name };
    if (d.type) body.type = d.type;
    if (d.regular_price) body.regular_price = d.regular_price;
    if (d.description) body.description = d.description;
    if (d.sku) body.sku = d.sku;
    if (d.status) body.status = d.status;
    const res = await utils.wcRequest(opts, "/products", { method: "POST", body });
    if (!res.ok) return res;
    const p = res.data || {};
    return { ok: true, id: String(p.id), name: p.name || "", type: p.type || "", status: p.status || "", price: p.price || "", sku: p.sku || "", stock_quantity: p.stock_quantity || 0, date_created: p.date_created || "" };
  }
};
