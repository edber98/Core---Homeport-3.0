const { utils } = require("./utils");

module.exports = {
  async wc_coupons_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;
    log('Récupération de la liste...');
    const res = await utils.wcRequest(opts, "/coupons", { query });
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : [];
    const coupons = items.map(c => ({ id: String(c.id), code: c.code || "", discount_type: c.discount_type || "", amount: c.amount || "", date_expires: c.date_expires || "" }));
    return { ok: true, coupons, totalCount: res.totalCount || 0, totalPages: res.totalPages || 0 };
  }
};
