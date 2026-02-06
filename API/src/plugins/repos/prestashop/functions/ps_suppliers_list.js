const { utils } = require("./utils");

module.exports = {
  async ps_suppliers_list(node, msg, inputs, opts) {
    const res = await utils.psRequest(opts, "/suppliers");
    if (!res.ok) return res;
    const items = (res.data && res.data.suppliers) || [];
    return { ok: true, status: "success", message: items.length + " fournisseur(s) trouvé(s)." };
  }
};
