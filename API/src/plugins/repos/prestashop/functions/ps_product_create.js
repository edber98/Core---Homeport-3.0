const { utils } = require("./utils");

module.exports = {
  async ps_product_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };
    if (!d.price) return { ok: false, error: "Missing price." };
    const product = { name: [{ id: 1, value: d.name }], price: d.price };
    if (d.reference) product.reference = d.reference;
    if (d.active !== undefined) product.active = d.active;
    const body = { product };
    const res = await utils.psRequest(opts, "/products", { method: "POST", body });
    if (!res.ok) return res;
    const p = (res.data && res.data.product) || {};
    return { ok: true, id: String(p.id), name: utils.psLangValue(p.name), price: String(p.price || ""), reference: p.reference || "", quantity: String(p.quantity || 0), active: String(p.active || ""), date_add: p.date_add || "" };
  }
};
