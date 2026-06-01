const { utils } = require("./utils");

module.exports = {
  async dolibarr_put_thirdparties_by_id_merge_by_idtodelete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.idtodelete && d.idtodelete !== 0) return { ok: false, error: "Champ idtodelete requis." };
    const query = d.query || "";
    let body = undefined;
    if (d.body_json) {
      try { body = JSON.parse(d.body_json); } catch (e) { return { ok: false, error: "body_json invalide (JSON attendu)." }; }
    }
    const path = `/thirdparties/${encodeURIComponent(d.id)}/merge/${encodeURIComponent(d.idtodelete)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
