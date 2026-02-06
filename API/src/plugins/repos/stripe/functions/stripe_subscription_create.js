const { utils } = require("./utils");

module.exports = {
  async stripe_subscription_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customer) return { ok: false, error: "Missing customer." };
    if (!d.items_price) return { ok: false, error: "Missing items_price (price ID)." };
    const body = {
      customer: d.customer,
      "items[0][price]": d.items_price
    };
    if (d.trial_period_days) body.trial_period_days = String(d.trial_period_days);
    const res = await utils.stripeRequest(opts, "/subscriptions", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
