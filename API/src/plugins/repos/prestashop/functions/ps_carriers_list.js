const { utils } = require("./utils");

module.exports = {
  async ps_carriers_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.psRequest(opts, "/carriers");
    if (!res.ok) return res;
    const items = (res.data && res.data.carriers) || [];
    return { ok: true, status: "success", message: items.length + " transporteur(s) trouvé(s)." };
  }
};
