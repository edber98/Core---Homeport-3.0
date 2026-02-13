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
  async odoo_mrp_production_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const payload = {};
        const _product_id = toStr(data.product_id);
        if (!_product_id) return { ok: false, error: "Champ product_id requis." };
        payload["product_id"] = _product_id;
        const _product_qty = toStr(data.product_qty);
        if (!_product_qty) return { ok: false, error: "Champ product_qty requis." };
        payload["product_qty"] = _product_qty;
        if (data.bom_id !== undefined && data.bom_id !== "" && data.bom_id !== null) payload["bom_id"] = data.bom_id;

        const res = await utils.odooCall(opts, "mrp.production", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, production: res.data };
  }
};
