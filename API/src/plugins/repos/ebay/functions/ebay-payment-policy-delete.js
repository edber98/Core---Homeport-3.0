const { utils } = require('./utils');

module.exports = {
  async ebay_payment_policy_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/account/v1/payment_policy/{payment_policy_id}";
    const payment_policy_id = String(d.payment_policy_id || '').trim();
    if (!payment_policy_id) return { ok: false, error: 'payment_policy_id requis.' };
    reqPath = reqPath.replace('{payment_policy_id}', encodeURIComponent(payment_policy_id));

    const query = {};
    

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
