const { utils } = require("./utils");

module.exports = {
  async dolibarr_delete_proposals_by_id_contact_by_contactid_by_type(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.contactid && d.contactid !== 0) return { ok: false, error: "Champ contactid requis." };
    if (!d.type && d.type !== 0) return { ok: false, error: "Champ type requis." };
    const query = d.query || "";
    const path = `/proposals/${encodeURIComponent(d.id)}/contact/${encodeURIComponent(d.contactid)}/${encodeURIComponent(d.type)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
