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
  async odoo_product_delete(node, msg, inputs, opts) {
    const data = inputs || {};
    const id = toInt(data.productId);
    if (!id) return { ok: false, error: "Champ productId requis." };

    const res = await utils.odooCall(opts, "product.product", "unlink", [[id]]);
    if (!res.ok) return res;
    return { ok: true, product: res.data };
  }
};
