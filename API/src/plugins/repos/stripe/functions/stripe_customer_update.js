const { utils } = require("./utils");

module.exports = {
  async stripe_customer_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const body = {};
    if (d.email) body.email = d.email;
    if (d.name) body.name = d.name;
    if (d.description) body.description = d.description;
    if (d.phone) body.phone = d.phone;
    const res = await utils.stripeRequest(opts, `/customers/${d.customerId}`, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
