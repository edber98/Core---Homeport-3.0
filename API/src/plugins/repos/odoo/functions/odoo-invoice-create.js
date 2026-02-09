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
  async odoo_invoice_create(node, msg, inputs, opts) {
        const data = inputs || {};
        const payload = {};
        const _partner_id = toStr(data.partner_id);
        if (!_partner_id) return { ok: false, error: "Champ partner_id requis." };
        payload["partner_id"] = _partner_id;
        if (data.move_type !== undefined && data.move_type !== "" && data.move_type !== null) payload["move_type"] = data.move_type;
        if (data.invoice_date !== undefined && data.invoice_date !== "" && data.invoice_date !== null) payload["invoice_date"] = data.invoice_date;

        const res = await utils.odooCall(opts, "account.move", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, invoice: res.data };
  }
};
