const { utils } = require("./utils");

module.exports = {
  async nc_file_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    log('Suppression en cours...');
    const res = await utils.webdavRequest(opts, d.path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Supprimé: ${d.path}` };
  }
};
