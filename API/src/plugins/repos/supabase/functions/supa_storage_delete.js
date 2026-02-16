const { utils } = require("./utils");

module.exports = {
  async supa_storage_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket || !d.path) return { ok: false, error: "Bucket et chemin requis." };

    const res = await utils.supaStorage(opts, `/object/${d.bucket}/${d.path}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Fichier ${d.path} supprimé de ${d.bucket}.`, count: 1 };
  }
};
