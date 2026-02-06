const { utils } = require("./utils");

module.exports = {
  async stripe_payment_intents_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.customer) query.customer = d.customer;
    const res = await utils.stripeRequest(opts, "/payment_intents", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const payment_intents = items.map(pi => ({
      id: pi.id, amount: pi.amount, currency: pi.currency, status: pi.status,
      customer: pi.customer, description: pi.description, created: pi.created
    }));
    return { ok: true, payment_intents };
  }
};
