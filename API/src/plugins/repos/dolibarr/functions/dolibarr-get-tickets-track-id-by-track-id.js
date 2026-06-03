const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_tickets_track_id_by_track_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.track_id && d.track_id !== 0) return { ok: false, error: "Champ track_id requis." };
    const query = d.query || "";
    const path = `/tickets/track_id/${encodeURIComponent(d.track_id)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
