const { utils } = require("./utils");

module.exports = {
  async stripe_checkout_session_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.sessionId) return { ok: false, error: "Missing sessionId." };
    log('Récupération des données...');
    const res = await utils.stripeRequest(opts, `/checkout/sessions/${d.sessionId}`);
    if (!res.ok) return res;
    const s = res.data;
    return {
      ok: true, id: s.id, url: s.url, mode: s.mode, status: s.status,
      customer: s.customer, amount_total: s.amount_total, currency: s.currency
    };
  }
};
