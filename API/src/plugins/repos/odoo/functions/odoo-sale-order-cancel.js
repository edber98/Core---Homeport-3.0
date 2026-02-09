const { utils } = require("./utils");

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_sale_order_cancel(node, msg, inputs, opts) {
    const data = inputs || {};
    const id = toInt(data.orderId);
    if (!id) return { ok: false, error: "Champ orderId requis." };

    const res = await utils.odooCall(opts, "sale.order", "action_cancel", [[id]]);
    if (!res.ok) return res;
    return { ok: true, sale_order: res.data };
  }
};
