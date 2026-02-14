const { utils } = require("./utils");

module.exports = {
  async dolibarr_bankaccounts_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    const params = {};
    if (d.sortfield !== undefined && d.sortfield !== null && d.sortfield !== "") params.sortfield = d.sortfield;
    if (d.sortorder !== undefined && d.sortorder !== null && d.sortorder !== "") params.sortorder = d.sortorder;
    if (d.limit !== undefined && d.limit !== null && d.limit !== "") params.limit = d.limit;
    if (d.page !== undefined && d.page !== null && d.page !== "") params.page = d.page;
    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const path = qs ? "/bankaccounts" + "?" + qs : "/bankaccounts";

    log('Récupération de la liste...');
    const res = await utils.dolibarrRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = Array.isArray(res.data) ? res.data : [];
    return { ok: true, items, totalCount: res.totalRecords || items.length };
  }
};
