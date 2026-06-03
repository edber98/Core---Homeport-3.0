const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_proposals_ref_ext_by_ref_ext(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.ref_ext && d.ref_ext !== 0) return { ok: false, error: "Champ ref_ext requis." };
    const query = d.query || "";
    const path = `/proposals/ref_ext/${encodeURIComponent(d.ref_ext)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
