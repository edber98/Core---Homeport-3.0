const { utils } = require("./utils");

module.exports = {
  async wc_products_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.status) query.status = d.status;
    if (d.category) query.category = d.category;
    if (d.page) query.page = d.page;
    const res = await utils.wcRequest(opts, "/products", { query });
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : [];
    const products = items.map(p => ({ id: String(p.id), name: p.name || "", type: p.type || "", status: p.status || "", price: p.price || "", sku: p.sku || "", stock_quantity: p.stock_quantity || 0, date_created: p.date_created || "" }));
    return { ok: true, products };
  }
};
