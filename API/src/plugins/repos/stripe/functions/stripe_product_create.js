const { utils } = require("./utils");

module.exports = {
  async stripe_product_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };
    const body = { name: d.name };
    if (d.description) body.description = d.description;
    if (d.active !== undefined && d.active !== null && d.active !== "") body.active = String(d.active);
    const res = await utils.stripeRequest(opts, "/products", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
