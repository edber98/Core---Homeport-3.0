const { utils } = require("./utils");

module.exports = {
  async dbx_delete_file(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };

    const res = await utils.dbxRequest(opts, "/files/delete_v2", { path: d.path });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `${d.path} supprimé.` };
  }
};
