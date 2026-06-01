const { utils } = require("./utils");

module.exports = {
  async dolibarr_delete_categories_by_id_objects_by_type_by_object_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.type && d.type !== 0) return { ok: false, error: "Champ type requis." };
    if (!d.object_id && d.object_id !== 0) return { ok: false, error: "Champ object_id requis." };
    const query = d.query || "";
    const path = `/categories/${encodeURIComponent(d.id)}/objects/${encodeURIComponent(d.type)}/${encodeURIComponent(d.object_id)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
