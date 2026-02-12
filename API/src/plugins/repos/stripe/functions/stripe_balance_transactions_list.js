const { utils } = require("./utils");

module.exports = {
  async stripe_balance_transactions_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.type) query.type = d.type;
    const res = await utils.stripeRequest(opts, "/balance_transactions", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const transactions = items.map(t => ({
      id: t.id, amount: t.amount, currency: t.currency, type: t.type,
      status: t.status, created: t.created, description: t.description
    }));
    const hasMore = !!(res.data && res.data.has_more);
    return { ok: true, transactions, hasMore };
  }
};
