const { utils } = require("./utils");

module.exports = {
  async dolibarr_post_proposals_by_id_contact_by_contactid_by_type(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.contactid && d.contactid !== 0) return { ok: false, error: "Champ contactid requis." };
    if (!d.type && d.type !== 0) return { ok: false, error: "Champ type requis." };
    const query = d.query || "";
    let body = undefined;
    if (d.body_json) {
      try { body = JSON.parse(d.body_json); } catch (e) { return { ok: false, error: "body_json invalide (JSON attendu)." }; }
    }
    const path = `/proposals/${encodeURIComponent(d.id)}/contact/${encodeURIComponent(d.contactid)}/${encodeURIComponent(d.type)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
