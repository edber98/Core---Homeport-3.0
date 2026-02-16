const { utils } = require("./utils");

module.exports = {
  async wc_orders_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.status) query.status = d.status;
    if (d.page) query.page = d.page;
    log('Récupération de la liste...');
    const res = await utils.wcRequest(opts, "/orders", { query });
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : [];
    const orders = items.map(o => ({ id: String(o.id), number: String(o.number || ""), status: o.status || "", total: o.total || "", currency: o.currency || "", billing_email: (o.billing && o.billing.email) || "", payment_method: o.payment_method || "", date_created: o.date_created || "" }));
    return { ok: true, orders, totalCount: res.totalCount || 0, totalPages: res.totalPages || 0 };
  }
};
