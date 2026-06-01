const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_members_thirdparty_accounts_by_site_by_key_account(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.site && d.site !== 0) return { ok: false, error: "Champ site requis." };
    if (!d.key_account && d.key_account !== 0) return { ok: false, error: "Champ key_account requis." };
    const query = d.query || "";
    const path = `/members/thirdparty/accounts/${encodeURIComponent(d.site)}/${encodeURIComponent(d.key_account)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
