const { utils } = require("./utils");

module.exports = {
  async stripe_product_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.productId) return { ok: false, error: "Missing productId." };
    const res = await utils.stripeRequest(opts, `/products/${d.productId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
