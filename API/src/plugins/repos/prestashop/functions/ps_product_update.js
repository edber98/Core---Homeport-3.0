const { utils } = require("./utils");

module.exports = {
  async ps_product_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const product = {};
    if (d.name) product.name = [{ id: 1, value: d.name }];
    if (d.price) product.price = d.price;
    if (d.reference) product.reference = d.reference;
    if (d.active !== undefined) product.active = d.active;
    const body = { product };
    const res = await utils.psRequest(opts, `/products/${d.productId}`, { method: "PUT", body });
    if (!res.ok) return res;
    const p = (res.data && res.data.product) || {};
    return { ok: true, id: String(p.id), name: utils.psLangValue(p.name), price: String(p.price || ""), reference: p.reference || "", quantity: String(p.quantity || 0), active: String(p.active || ""), date_add: p.date_add || "" };
  }
};
