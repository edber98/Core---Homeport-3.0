const { utils } = require('./utils');

module.exports = {
  async ebay_account_get_sales_tax(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/account/v1/sales_tax/{countryCode}/{jurisdictionId}";
    const countrycode = String(d.countrycode || '').trim();
    if (!countrycode) return { ok: false, error: 'countrycode requis.' };
    reqPath = reqPath.replace('{countrycode}', encodeURIComponent(countrycode));
    const jurisdictionid = String(d.jurisdictionid || '').trim();
    if (!jurisdictionid) return { ok: false, error: 'jurisdictionid requis.' };
    reqPath = reqPath.replace('{jurisdictionid}', encodeURIComponent(jurisdictionid));

    const query = {};
    

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
