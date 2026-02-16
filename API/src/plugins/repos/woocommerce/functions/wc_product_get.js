const { utils } = require("./utils");

module.exports = {
  async wc_product_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    log('Récupération des données...');
    const res = await utils.wcRequest(opts, `/products/${d.productId}`);
    if (!res.ok) return res;
    const p = res.data || {};
    return { ok: true, id: String(p.id), name: p.name || "", type: p.type || "", status: p.status || "", price: p.price || "", sku: p.sku || "", stock_quantity: p.stock_quantity || 0, date_created: p.date_created || "" };
  }
};
