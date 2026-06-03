const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_members_thirdparty_by_thirdparty(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.thirdparty && d.thirdparty !== 0) return { ok: false, error: "Champ thirdparty requis." };
    const query = d.query || "";
    const path = `/members/thirdparty/${encodeURIComponent(d.thirdparty)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
