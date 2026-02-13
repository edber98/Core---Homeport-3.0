const { utils } = require("./utils");

module.exports = {
  async ps_order_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    log('Récupération des données...');
    const res = await utils.psRequest(opts, `/orders/${d.orderId}`);
    if (!res.ok) return res;
    const o = (res.data && res.data.order) || {};
    return { ok: true, id: String(o.id), reference: o.reference || "", total_paid: String(o.total_paid || ""), current_state: String(o.current_state || ""), payment: o.payment || "", date_add: o.date_add || "" };
  }
};
