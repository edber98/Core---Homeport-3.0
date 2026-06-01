const { utils } = require("./utils");

module.exports = {
  async dolibarr_delete_products_by_id_purchase_prices_by_priceid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.priceid && d.priceid !== 0) return { ok: false, error: "Champ priceid requis." };
    const query = d.query || "";
    const path = `/products/${encodeURIComponent(d.id)}/purchase_prices/${encodeURIComponent(d.priceid)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
