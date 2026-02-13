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
  async odoo_product_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const payload = {};
        const _name = toStr(data.name);
        if (!_name) return { ok: false, error: "Champ name requis." };
        payload["name"] = _name;
        if (data.list_price !== undefined && data.list_price !== "" && data.list_price !== null) payload["list_price"] = data.list_price;
        if (data.default_code !== undefined && data.default_code !== "" && data.default_code !== null) payload["default_code"] = data.default_code;
        if (data.type !== undefined && data.type !== "" && data.type !== null) payload["type"] = data.type;
        if (data.categ_id !== undefined && data.categ_id !== "" && data.categ_id !== null) payload["categ_id"] = data.categ_id;

        const res = await utils.odooCall(opts, "product.product", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, product: res.data };
  }
};
