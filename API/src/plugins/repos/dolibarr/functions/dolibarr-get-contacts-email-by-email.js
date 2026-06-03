const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_contacts_email_by_email(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.email && d.email !== 0) return { ok: false, error: "Champ email requis." };
    const query = d.query || "";
    const path = `/contacts/email/${encodeURIComponent(d.email)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
