const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_tasks_by_id_gettimespent_by_timespent_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.timespent_id && d.timespent_id !== 0) return { ok: false, error: "Champ timespent_id requis." };
    const query = d.query || "";
    const path = `/tasks/${encodeURIComponent(d.id)}/getTimeSpent/${encodeURIComponent(d.timespent_id)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
