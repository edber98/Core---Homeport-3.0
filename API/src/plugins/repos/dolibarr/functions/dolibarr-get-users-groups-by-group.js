const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_users_groups_by_group(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.group && d.group !== 0) return { ok: false, error: "Champ group requis." };
    const query = d.query || "";
    const path = `/users/groups/${encodeURIComponent(d.group)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
