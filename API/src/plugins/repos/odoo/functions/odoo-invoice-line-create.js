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
  async odoo_invoice_line_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const moveId = toInt(data.move_id);
    if (!moveId) return { ok: false, error: "Champ move_id requis." };

    const payload = {
      move_id: moveId,
    };
    if (toInt(data.product_id)) payload.product_id = toInt(data.product_id);
    if (data.name) payload.name = data.name;
    if (toFloat(data.quantity) !== null) payload.quantity = toFloat(data.quantity);
    if (toFloat(data.price_unit) !== null) payload.price_unit = toFloat(data.price_unit);
    if (toInt(data.account_id)) payload.account_id = toInt(data.account_id);
    if (toFloat(data.discount) !== null) payload.discount = toFloat(data.discount);

    const res = await utils.odooCall(opts, "account.move.line", "create", [payload]);
    if (!res.ok) return res;
    return { ok: true, id: res.data };
  }
};
