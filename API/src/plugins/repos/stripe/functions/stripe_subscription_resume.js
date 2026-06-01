const { utils } = require('./utils');
module.exports = {
  async stripe_subscription_resume(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.subscriptionId) return { ok: false, error: 'Missing subscriptionId.' };
    const body = {};
    if (d.billing_cycle_anchor) body.billing_cycle_anchor = d.billing_cycle_anchor;
    const res = await utils.stripeRequest(opts, `/subscriptions/${d.subscriptionId}/resume`, { method: 'POST', body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
