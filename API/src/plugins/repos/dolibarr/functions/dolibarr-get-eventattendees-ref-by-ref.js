const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_eventattendees_ref_by_ref(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.ref && d.ref !== 0) return { ok: false, error: "Champ ref requis." };
    const query = d.query || "";
    const path = `/eventattendees/ref/${encodeURIComponent(d.ref)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
