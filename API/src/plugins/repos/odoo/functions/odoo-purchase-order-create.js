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
  async odoo_purchase_order_create(node, msg, inputs, opts) {
        const data = inputs || {};
        const payload = {};
        const _partner_id = toStr(data.partner_id);
        if (!_partner_id) return { ok: false, error: "Champ partner_id requis." };
        payload["partner_id"] = _partner_id;
        if (data.date_order !== undefined && data.date_order !== "" && data.date_order !== null) payload["date_order"] = data.date_order;

        const res = await utils.odooCall(opts, "purchase.order", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, purchase_order: res.data };
  }
};
