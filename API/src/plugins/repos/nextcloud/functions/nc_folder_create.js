const { utils } = require("./utils");

module.exports = {
  async nc_folder_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    log('Création en cours...');
    const res = await utils.webdavRequest(opts, d.path, { method: "MKCOL" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "created", message: `Dossier créé: ${d.path}` };
  }
};
