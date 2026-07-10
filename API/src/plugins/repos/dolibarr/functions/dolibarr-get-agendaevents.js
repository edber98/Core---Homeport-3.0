const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_agendaevents(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    // accepte limit/page/sortfield (comme les autres list) + renvoie `items` (tableau)
    // pour que le watch « calendar » ingère ; fallback sur d.query brut.
    const params = {};
    if (d.sortfield) params.sortfield = d.sortfield;
    if (d.limit !== undefined && d.limit !== null && d.limit !== "") params.limit = d.limit;
    if (d.page !== undefined && d.page !== null && d.page !== "") params.page = d.page;
    if (d.sqlfilters) params.sqlfilters = d.sqlfilters;
    const extra = d.query ? String(d.query).replace(/^\?/, "") : Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const path = `/agendaevents` + (extra ? "?" + extra : "");
    log('Requête API Dolibarr (agenda)...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = Array.isArray(res.data) ? res.data : [];
    return { ok: true, items, data: items, totalRecords: res.totalRecords || items.length };
  }
};
