const { utils } = require("./utils");

module.exports = {
  async ps_product_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    log('Récupération des données...');
    const res = await utils.psRequest(opts, `/products/${d.productId}`);
    if (!res.ok) return res;
    const p = (res.data && res.data.product) || {};
    return { ok: true, id: String(p.id), name: utils.psLangValue(p.name), price: String(p.price || ""), reference: p.reference || "", quantity: String(p.quantity || 0), active: String(p.active || ""), date_add: p.date_add || "" };
  }
};
