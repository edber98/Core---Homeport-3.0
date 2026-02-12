const { utils } = require("./utils");

module.exports = {
  async stripe_subscriptions_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.customer) query.customer = d.customer;
    if (d.status) query.status = d.status;
    const res = await utils.stripeRequest(opts, "/subscriptions", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const subscriptions = items.map(s => ({
      id: s.id, customer: s.customer, status: s.status,
      current_period_start: s.current_period_start, current_period_end: s.current_period_end,
      created: s.created, cancel_at_period_end: s.cancel_at_period_end
    }));
    const hasMore = !!(res.data && res.data.has_more);
    return { ok: true, subscriptions, hasMore };
  }
};
