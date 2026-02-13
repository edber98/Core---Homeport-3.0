const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFloat(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_sale_order_line_create(node, msg, inputs, opts) {
    const data = inputs || {};
    const orderId = toInt(data.order_id);
    const productId = toInt(data.product_id);
    if (!orderId) return { ok: false, error: "Champ order_id requis." };
    if (!productId) return { ok: false, error: "Champ product_id requis." };

    const payload = {
      order_id: orderId,
      product_id: productId,
    };
    if (data.name) payload.name = data.name;
    if (toFloat(data.product_uom_qty) !== null) payload.product_uom_qty = toFloat(data.product_uom_qty);
    if (toFloat(data.price_unit) !== null) payload.price_unit = toFloat(data.price_unit);
    if (toFloat(data.discount) !== null) payload.discount = toFloat(data.discount);
    if (toInt(data.product_uom)) payload.product_uom = toInt(data.product_uom);

    const res = await utils.odooCall(opts, "sale.order.line", "create", [payload]);
    if (!res.ok) return res;
    return { ok: true, id: res.data };
  }
};
