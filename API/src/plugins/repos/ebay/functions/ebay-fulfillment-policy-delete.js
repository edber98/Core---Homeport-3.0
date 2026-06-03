const { utils } = require('./utils');

module.exports = {
  async ebay_fulfillment_policy_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/account/v1/fulfillment_policy/{fulfillmentPolicyId}";
    const fulfillmentpolicyid = String(d.fulfillmentpolicyid || '').trim();
    if (!fulfillmentpolicyid) return { ok: false, error: 'fulfillmentpolicyid requis.' };
    reqPath = reqPath.replace('{fulfillmentpolicyid}', encodeURIComponent(fulfillmentpolicyid));

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
