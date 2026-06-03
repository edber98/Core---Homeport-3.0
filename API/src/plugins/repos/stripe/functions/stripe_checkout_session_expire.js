const { utils } = require('./utils');
module.exports = {
  async stripe_checkout_session_expire(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.sessionId) return { ok: false, error: 'Missing sessionId.' };
    const res = await utils.stripeRequest(opts, `/checkout/sessions/${d.sessionId}/expire`, { method: 'POST', body: {} });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
