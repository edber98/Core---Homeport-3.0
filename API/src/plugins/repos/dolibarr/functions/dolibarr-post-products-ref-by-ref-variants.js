const { utils } = require("./utils");

module.exports = {
  async dolibarr_post_products_ref_by_ref_variants(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.ref && d.ref !== 0) return { ok: false, error: "Champ ref requis." };
    const query = d.query || "";
    let body = undefined;
    if (d.body_json) {
      try { body = JSON.parse(d.body_json); } catch (e) { return { ok: false, error: "body_json invalide (JSON attendu)." }; }
    }
    const path = `/products/ref/${encodeURIComponent(d.ref)}/variants` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
