const { utils } = require("./utils");

module.exports = {
  async stripe_refunds_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.charge) query.charge = d.charge;
    log('Récupération de la liste...');
    const res = await utils.stripeRequest(opts, "/refunds", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const refunds = items.map(r => ({
      id: r.id, amount: r.amount, currency: r.currency, status: r.status,
      charge: r.charge, reason: r.reason, created: r.created
    }));
    const hasMore = !!(res.data && res.data.has_more);
    return { ok: true, refunds, hasMore , totalCount: refunds.length };
  }
};
