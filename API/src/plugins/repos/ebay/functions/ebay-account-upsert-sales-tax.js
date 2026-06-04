const { utils } = require('./utils');

module.exports = {
  async ebay_account_upsert_sales_tax(node, msg, inputs, opts) {
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
    

    const body = utils.buildBodyFromInputs(d, [{"source":"salesTaxPercentage","target":"salesTaxPercentage","type":"text"},{"source":"shippingAndHandlingTaxed","target":"shippingAndHandlingTaxed","type":"checkbox"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
