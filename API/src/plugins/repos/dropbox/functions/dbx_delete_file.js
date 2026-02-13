const { utils } = require("./utils");

module.exports = {
  async dbx_delete_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };

    log('Suppression en cours...');
    const res = await utils.dbxRequest(opts, "/files/delete_v2", { path: d.path });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `${d.path} supprimé.` };
  }
};
