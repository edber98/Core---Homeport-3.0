const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_bankaccounts_by_id_lines_by_line_id_links(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.line_id && d.line_id !== 0) return { ok: false, error: "Champ line_id requis." };
    const query = d.query || "";
    const path = `/bankaccounts/${encodeURIComponent(d.id)}/lines/${encodeURIComponent(d.line_id)}/links` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
