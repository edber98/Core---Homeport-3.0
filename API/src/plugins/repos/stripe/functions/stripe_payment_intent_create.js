const { utils } = require("./utils");

module.exports = {
  async stripe_payment_intent_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.amount && d.amount !== 0) return { ok: false, error: "Missing amount." };
    if (!d.currency) return { ok: false, error: "Missing currency." };
    const body = { amount: String(d.amount), currency: d.currency };
    if (d.customer) body.customer = d.customer;
    if (d.description) body.description = d.description;
    if (d.payment_method_types) {
      const types = String(d.payment_method_types).split(",").map(t => t.trim()).filter(Boolean);
      types.forEach((t, i) => { body[`payment_method_types[${i}]`] = t; });
    }
    const res = await utils.stripeRequest(opts, "/payment_intents", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
