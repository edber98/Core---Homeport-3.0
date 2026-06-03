const { utils } = require('./utils');

module.exports = {
  async openrouter_credit_get_getcredits(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Requête en cours...');

    const res = await utils.providerRequest(opts, '/credits', { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Crédits récupérés.',
      raw: res.data || {}
    };
  }
};
