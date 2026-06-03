const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_partnerships_partnerships(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    // Aucun paramètre de chemin requis.
    const query = d.query || "";
    const path = `/partnerships/partnerships` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
