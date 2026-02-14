const { utils } = require("./utils");

module.exports = {
  async stripe_checkout_sessions_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    log('Récupération de la liste...');
    const res = await utils.stripeRequest(opts, "/checkout/sessions", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const sessions = items.map(s => ({
      id: s.id, url: s.url, mode: s.mode, status: s.status,
      customer: s.customer, amount_total: s.amount_total, currency: s.currency
    }));
    const hasMore = !!(res.data && res.data.has_more);
    return { ok: true, sessions, hasMore , totalCount: sessions.length };
  }
};
