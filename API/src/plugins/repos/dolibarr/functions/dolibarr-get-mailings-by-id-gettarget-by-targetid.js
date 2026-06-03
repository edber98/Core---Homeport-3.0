const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_mailings_by_id_gettarget_by_targetid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.targetid && d.targetid !== 0) return { ok: false, error: "Champ targetid requis." };
    const query = d.query || "";
    const path = `/mailings/${encodeURIComponent(d.id)}/getTarget/${encodeURIComponent(d.targetid)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
