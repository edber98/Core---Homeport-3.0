const { utils } = require("./utils");

module.exports = {
  async pl_products_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;

    log('Récupération de la liste...');
    const res = await utils.plRequest(opts, "/products", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.products) || [];
    const products = results.map(r => ({ id: String(r.source_id || r.id || ""), label: r.label || "", price: String(r.price || ""), unit: r.unit || "", reference: r.reference || "" }));
    return { ok: true, products , totalCount: products.length };
  }
};
