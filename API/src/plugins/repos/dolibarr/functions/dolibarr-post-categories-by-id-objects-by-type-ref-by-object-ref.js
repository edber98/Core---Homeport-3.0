const { utils } = require("./utils");

module.exports = {
  async dolibarr_post_categories_by_id_objects_by_type_ref_by_object_ref(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.type && d.type !== 0) return { ok: false, error: "Champ type requis." };
    if (!d.object_ref && d.object_ref !== 0) return { ok: false, error: "Champ object_ref requis." };
    const query = d.query || "";
    let body = undefined;
    if (d.body_json) {
      try { body = JSON.parse(d.body_json); } catch (e) { return { ok: false, error: "body_json invalide (JSON attendu)." }; }
    }
    const path = `/categories/${encodeURIComponent(d.id)}/objects/${encodeURIComponent(d.type)}/ref/${encodeURIComponent(d.object_ref)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
