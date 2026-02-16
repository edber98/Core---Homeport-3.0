const { utils } = require("./utils");

module.exports = {
  async stripe_payment_intent_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.paymentIntentId) return { ok: false, error: "Missing paymentIntentId." };
    log('Appel API en cours...');
    const res = await utils.stripeRequest(opts, `/payment_intents/${d.paymentIntentId}/cancel`, { method: "POST", body: {} });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
