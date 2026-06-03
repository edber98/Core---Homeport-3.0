const { utils } = require("./utils");

module.exports = {
  async dolibarr_delete_supplier_orders_by_id_contact_by_contactid_by_type_by_source(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.contactid && d.contactid !== 0) return { ok: false, error: "Champ contactid requis." };
    if (!d.type && d.type !== 0) return { ok: false, error: "Champ type requis." };
    if (!d.source && d.source !== 0) return { ok: false, error: "Champ source requis." };
    const query = d.query || "";
    const path = `/supplier_orders/${encodeURIComponent(d.id)}/contact/${encodeURIComponent(d.contactid)}/${encodeURIComponent(d.type)}/${encodeURIComponent(d.source)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
