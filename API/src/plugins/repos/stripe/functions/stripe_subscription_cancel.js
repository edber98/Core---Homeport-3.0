const { utils } = require("./utils");

module.exports = {
  async stripe_subscription_cancel(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.subscriptionId) return { ok: false, error: "Missing subscriptionId." };
    const res = await utils.stripeRequest(opts, `/subscriptions/${d.subscriptionId}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, status: "canceled", message: `Subscription ${d.subscriptionId} canceled.` };
  }
};
