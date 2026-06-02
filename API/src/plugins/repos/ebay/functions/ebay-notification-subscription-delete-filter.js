const { utils } = require('./utils');

module.exports = {
  async ebay_notification_subscription_delete_filter(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/commerce/notification/v1/subscription/{subscriptionId}/filter/{filterId}";
    const subscriptionid = String(d.subscriptionid || '').trim();
    if (!subscriptionid) return { ok: false, error: 'subscriptionid requis.' };
    reqPath = reqPath.replace('{subscriptionid}', encodeURIComponent(subscriptionid));
    const filterid = String(d.filterid || '').trim();
    if (!filterid) return { ok: false, error: 'filterid requis.' };
    reqPath = reqPath.replace('{filterid}', encodeURIComponent(filterid));

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
