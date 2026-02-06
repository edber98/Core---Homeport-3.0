const { utils } = require("./utils");

module.exports = {
  async stripe_charges_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.customer) query.customer = d.customer;
    const res = await utils.stripeRequest(opts, "/charges", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const charges = items.map(c => ({
      id: c.id, amount: c.amount, currency: c.currency, status: c.status,
      customer: c.customer, description: c.description, created: c.created
    }));
    return { ok: true, charges };
  }
};
