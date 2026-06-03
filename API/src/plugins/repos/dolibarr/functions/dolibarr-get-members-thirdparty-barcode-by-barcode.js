const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_members_thirdparty_barcode_by_barcode(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.barcode && d.barcode !== 0) return { ok: false, error: "Champ barcode requis." };
    const query = d.query || "";
    const path = `/members/thirdparty/barcode/${encodeURIComponent(d.barcode)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
