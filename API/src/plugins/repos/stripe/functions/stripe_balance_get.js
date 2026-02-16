const { utils } = require("./utils");

module.exports = {
  async stripe_balance_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des données...');
    const res = await utils.stripeRequest(opts, "/balance");
    if (!res.ok) return res;
    const b = res.data;
    const avail = (b.available && b.available[0]) || {};
    const pend = (b.pending && b.pending[0]) || {};
    return {
      ok: true,
      available_amount: avail.amount || 0,
      available_currency: avail.currency || null,
      pending_amount: pend.amount || 0,
      pending_currency: pend.currency || null
    };
  }
};
