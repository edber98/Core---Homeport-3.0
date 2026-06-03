const { utils } = require("./utils");

module.exports = {
  async dolibarr_post_shipments_createfromorder_by_orderid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.orderid && d.orderid !== 0) return { ok: false, error: "Champ orderid requis." };
    const query = d.query || "";
    let body = undefined;
    if (d.body_json) {
      try { body = JSON.parse(d.body_json); } catch (e) { return { ok: false, error: "body_json invalide (JSON attendu)." }; }
    }
    const path = `/shipments/createfromorder/${encodeURIComponent(d.orderid)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
