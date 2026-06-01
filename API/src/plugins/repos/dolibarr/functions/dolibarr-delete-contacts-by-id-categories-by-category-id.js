const { utils } = require("./utils");

module.exports = {
  async dolibarr_delete_contacts_by_id_categories_by_category_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.category_id && d.category_id !== 0) return { ok: false, error: "Champ category_id requis." };
    const query = d.query || "";
    const path = `/contacts/${encodeURIComponent(d.id)}/categories/${encodeURIComponent(d.category_id)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
