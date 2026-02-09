const { utils } = require("./utils");

module.exports = {
  async stripe_customers_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.email) query.email = d.email;
    const res = await utils.stripeRequest(opts, "/customers", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const customers = items.map(c => ({
      id: c.id, email: c.email, name: c.name, description: c.description,
      phone: c.phone, created: c.created, currency: c.currency
    }));
    return { ok: true, customers };
  }
};
