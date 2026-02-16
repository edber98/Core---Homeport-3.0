const { utils } = require("./utils");

module.exports = {
  async stripe_product_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.description) body.description = d.description;
    if (d.active !== undefined && d.active !== null && d.active !== "") body.active = String(d.active);
    log('Mise à jour en cours...');
    const res = await utils.stripeRequest(opts, `/products/${d.productId}`, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
