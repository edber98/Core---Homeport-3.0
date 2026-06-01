const { utils } = require('./utils');

module.exports = {
  async stability_ai_user_balance_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Requête en cours...');
    const res = await utils.providerRequest(opts, '/v1/user/balance', { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    const credits = r.credits ?? r.balance ?? r.available_credits ?? '';
    return {
      ok: true,
      status: res.status || 200,
      message: `Crédits disponibles: ${credits}`,
      raw: r
    };
  }
};
