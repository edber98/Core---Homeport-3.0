const { utils } = require("./utils");

module.exports = {
  async ms_sp_delete_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.itemId) return { ok: false, error: "Missing itemId." };

    log('Suppression en cours...');
    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/drive/items/${d.itemId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Fichier ${d.itemId} supprimé.` };
  }
};
