const { utils } = require("./utils");

module.exports = {
  async stripe_payment_intent_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.paymentIntentId) return { ok: false, error: "Missing paymentIntentId." };
    const res = await utils.stripeRequest(opts, `/payment_intents/${d.paymentIntentId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
