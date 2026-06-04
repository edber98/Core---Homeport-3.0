const { utils } = require('./utils');

module.exports = {
  async ebay_notification_subscription_create_filter(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/commerce/notification/v1/subscription/{subscriptionId}/filter";
    const subscriptionid = String(d.subscriptionid || '').trim();
    if (!subscriptionid) return { ok: false, error: 'subscriptionid requis.' };
    reqPath = reqPath.replace('{subscriptionid}', encodeURIComponent(subscriptionid));

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"filterSchema","target":"filterSchema","type":"text"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
