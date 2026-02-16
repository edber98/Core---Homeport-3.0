const { utils } = require("./utils");

module.exports = {
  async ps_products_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query["limit"] = d.limit;
    if (d.page && d.limit) query["limit"] = ((d.page - 1) * d.limit) + "," + d.limit;
    log('Récupération de la liste...');
    const res = await utils.psRequest(opts, "/products", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.products) || [];
    const products = items.map(p => ({ id: String(p.id), name: utils.psLangValue(p.name), price: String(p.price || ""), reference: p.reference || "", quantity: String(p.quantity || 0), active: String(p.active || ""), date_add: p.date_add || "" }));
    return { ok: true, products , totalCount: products.length };
  }
};
