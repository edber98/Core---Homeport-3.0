const { utils } = require("./utils");

module.exports = {
  async stripe_prices_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.product) query.product = d.product;
    if (d.active !== undefined && d.active !== null && d.active !== "") query.active = String(d.active);
    const res = await utils.stripeRequest(opts, "/prices", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const prices = items.map(p => ({
      id: p.id, product: p.product, unit_amount: p.unit_amount,
      currency: p.currency, type: p.type,
      recurring_interval: p.recurring && p.recurring.interval ? p.recurring.interval : null,
      active: p.active
    }));
    const hasMore = !!(res.data && res.data.has_more);
    return { ok: true, prices, hasMore };
  }
};
