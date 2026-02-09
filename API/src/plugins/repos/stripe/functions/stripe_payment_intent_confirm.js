const { utils } = require("./utils");

module.exports = {
  async stripe_payment_intent_confirm(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.paymentIntentId) return { ok: false, error: "Missing paymentIntentId." };
    const body = {};
    if (d.payment_method) body.payment_method = d.payment_method;
    const res = await utils.stripeRequest(opts, `/payment_intents/${d.paymentIntentId}/confirm`, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
