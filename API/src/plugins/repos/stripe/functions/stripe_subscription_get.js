const { utils } = require("./utils");

module.exports = {
  async stripe_subscription_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.subscriptionId) return { ok: false, error: "Missing subscriptionId." };
    log('Récupération des données...');
    const res = await utils.stripeRequest(opts, `/subscriptions/${d.subscriptionId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
