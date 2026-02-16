const { utils } = require("./utils");

module.exports = {
  async ps_categories_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query["limit"] = d.limit;
    if (d.page && d.limit) query["limit"] = ((d.page - 1) * d.limit) + "," + d.limit;
    log('Récupération de la liste...');
    const res = await utils.psRequest(opts, "/categories", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.categories) || [];
    const categories = items.map(c => ({ id: String(c.id), name: utils.psLangValue(c.name), active: String(c.active || ""), id_parent: String(c.id_parent || "") }));
    return { ok: true, categories , totalCount: categories.length };
  }
};
