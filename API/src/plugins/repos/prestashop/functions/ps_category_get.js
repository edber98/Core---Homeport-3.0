const { utils } = require("./utils");

module.exports = {
  async ps_category_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.categoryId) return { ok: false, error: "Missing categoryId." };
    log('Récupération des données...');
    const res = await utils.psRequest(opts, `/categories/${d.categoryId}`);
    if (!res.ok) return res;
    const c = (res.data && res.data.category) || {};
    return { ok: true, id: String(c.id), name: utils.psLangValue(c.name), active: String(c.active || ""), id_parent: String(c.id_parent || "") };
  }
};
