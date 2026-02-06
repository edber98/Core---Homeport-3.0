const { utils } = require("./utils");

module.exports = {
  async stripe_refund_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.charge && !d.payment_intent) return { ok: false, error: "Missing charge or payment_intent." };
    const body = {};
    if (d.charge) body.charge = d.charge;
    if (d.payment_intent) body.payment_intent = d.payment_intent;
    if (d.amount) body.amount = String(d.amount);
    if (d.reason) body.reason = d.reason;
    const res = await utils.stripeRequest(opts, "/refunds", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
