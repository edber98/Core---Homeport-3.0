const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_multicurrencies_bycode_by_code(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.code && d.code !== 0) return { ok: false, error: "Champ code requis." };
    const query = d.query || "";
    const path = `/multicurrencies/bycode/${encodeURIComponent(d.code)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
