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
  async odoo_product_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const id = toInt(data.productId);
        if (!id) return { ok: false, error: "Champ productId requis." };
        const payload = {};
        if (data.name !== undefined && data.name !== "" && data.name !== null) payload["name"] = data.name;
        if (data.list_price !== undefined && data.list_price !== "" && data.list_price !== null) payload["list_price"] = data.list_price;
        if (data.default_code !== undefined && data.default_code !== "" && data.default_code !== null) payload["default_code"] = data.default_code;

        const res = await utils.odooCall(opts, "product.product", "write", [[id], payload]);
        if (!res.ok) return res;
        return { ok: true, product: res.data };
  }
};
