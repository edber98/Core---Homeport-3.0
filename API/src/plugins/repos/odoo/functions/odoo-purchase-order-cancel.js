const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_purchase_order_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const id = toInt(data.orderId);
    if (!id) return { ok: false, error: "Champ orderId requis." };

    const res = await utils.odooCall(opts, "purchase.order", "button_cancel", [[id]]);
    if (!res.ok) return res;
    return { ok: true, cancelled: true, id };
  }
};
