const { utils } = require("./utils");

module.exports = {
  async dolibarr_delete_products_by_id_subproducts_remove_by_subproduct_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.subproduct_id && d.subproduct_id !== 0) return { ok: false, error: "Champ subproduct_id requis." };
    const query = d.query || "";
    const path = `/products/${encodeURIComponent(d.id)}/subproducts/remove/${encodeURIComponent(d.subproduct_id)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
