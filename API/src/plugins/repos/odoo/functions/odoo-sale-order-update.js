const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_sale_order_update(node, msg, inputs, opts) {
    const data = inputs || {};
    const id = toInt(data.orderId);
    if (!id) return { ok: false, error: "Champ orderId requis." };

    const payload = {};
    if (toInt(data.partner_id)) payload.partner_id = toInt(data.partner_id);
    if (data.note) payload.note = data.note;
    if (data.client_order_ref) payload.client_order_ref = data.client_order_ref;
    if (data.validity_date) payload.validity_date = data.validity_date;
    if (toInt(data.payment_term_id)) payload.payment_term_id = toInt(data.payment_term_id);
    if (toInt(data.pricelist_id)) payload.pricelist_id = toInt(data.pricelist_id);

    if (!Object.keys(payload).length) return { ok: false, error: "Aucun champ à mettre à jour." };

    const res = await utils.odooCall(opts, "sale.order", "write", [[id], payload]);
    if (!res.ok) return res;
    return { ok: true, updated: true, id };
  }
};
