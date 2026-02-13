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
  async odoo_stock_picking_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const payload = {};
        const _picking_type_id = toStr(data.picking_type_id);
        if (!_picking_type_id) return { ok: false, error: "Champ picking_type_id requis." };
        payload["picking_type_id"] = _picking_type_id;
        if (data.partner_id !== undefined && data.partner_id !== "" && data.partner_id !== null) payload["partner_id"] = data.partner_id;
        if (data.origin !== undefined && data.origin !== "" && data.origin !== null) payload["origin"] = data.origin;

        const res = await utils.odooCall(opts, "stock.picking", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, picking: res.data };
  }
};
