const { utils } = require('./utils');

module.exports = {
  async ebay_fulfillment_policy_get_by_name(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/account/v1/fulfillment_policy/get_by_policy_name";
    

    const query = {};
    if (d.marketplaceid !== undefined && d.marketplaceid !== null && d.marketplaceid !== '') query["marketplaceid"] = d.marketplaceid;
    if (d.name !== undefined && d.name !== null && d.name !== '') query["name"] = d.name;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
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
