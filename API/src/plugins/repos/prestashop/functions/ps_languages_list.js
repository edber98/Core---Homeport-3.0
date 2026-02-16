const { utils } = require("./utils");

module.exports = {
  async ps_languages_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.psRequest(opts, "/languages");
    if (!res.ok) return res;
    const items = (res.data && res.data.languages) || [];
    return { ok: true, status: "success", message: items.length + " langue(s) trouvée(s)." };
  }
};
