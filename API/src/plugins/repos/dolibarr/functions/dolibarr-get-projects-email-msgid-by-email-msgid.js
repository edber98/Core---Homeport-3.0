const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_projects_email_msgid_by_email_msgid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.email_msgid && d.email_msgid !== 0) return { ok: false, error: "Champ email_msgid requis." };
    const query = d.query || "";
    const path = `/projects/email_msgid/${encodeURIComponent(d.email_msgid)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
