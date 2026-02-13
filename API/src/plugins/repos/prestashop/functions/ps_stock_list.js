const { utils } = require("./utils");

module.exports = {
  async ps_stock_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query["limit"] = d.limit;
    if (d.page && d.limit) query["limit"] = ((d.page - 1) * d.limit) + "," + d.limit;
    log('Récupération de la liste...');
    const res = await utils.psRequest(opts, "/stock_availables", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.stock_availables) || [];
    const first = items[0] || {};
    return { ok: true, id: String(first.id || ""), id_product: String(first.id_product || ""), quantity: first.quantity || 0 };
  }
};
