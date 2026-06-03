const { utils } = require('./utils');

module.exports = {
  async ebay_return_policy_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/account/v1/return_policy/{return_policy_id}";
    const return_policy_id = String(d.return_policy_id || '').trim();
    if (!return_policy_id) return { ok: false, error: 'return_policy_id requis.' };
    reqPath = reqPath.replace('{return_policy_id}', encodeURIComponent(return_policy_id));

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
