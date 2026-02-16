const { utils } = require("./utils");

module.exports = {
  async stripe_subscription_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.subscriptionId) return { ok: false, error: "Missing subscriptionId." };
    const body = {};
    if (d.cancel_at_period_end !== undefined && d.cancel_at_period_end !== null && d.cancel_at_period_end !== "") {
      body.cancel_at_period_end = String(d.cancel_at_period_end);
    }
    if (d.trial_end) body.trial_end = d.trial_end;
    log('Mise à jour en cours...');
    const res = await utils.stripeRequest(opts, `/subscriptions/${d.subscriptionId}`, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
