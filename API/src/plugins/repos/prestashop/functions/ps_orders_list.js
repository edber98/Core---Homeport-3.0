const { utils } = require("./utils");

module.exports = {
  async ps_orders_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query["limit"] = d.limit;
    if (d.page && d.limit) query["limit"] = ((d.page - 1) * d.limit) + "," + d.limit;
    log('Récupération de la liste...');
    const res = await utils.psRequest(opts, "/orders", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.orders) || [];
    const orders = items.map(o => ({ id: String(o.id), reference: o.reference || "", total_paid: String(o.total_paid || ""), current_state: String(o.current_state || ""), payment: o.payment || "", date_add: o.date_add || "" }));
    return { ok: true, orders , totalCount: orders.length };
  }
};
