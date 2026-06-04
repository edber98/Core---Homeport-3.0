const { utils } = require('./utils');

module.exports = {
  async ebay_return_policy_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/account/v1/return_policy";
    

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"categoryTypes","target":"categoryTypes","type":"json"},{"source":"description","target":"description","type":"text"},{"source":"extendedHolidayReturnsOffered","target":"extendedHolidayReturnsOffered","type":"checkbox"},{"source":"internationalOverride","target":"internationalOverride","type":"json"},{"source":"marketplaceId","target":"marketplaceId","type":"text"},{"source":"name","target":"name","type":"text"},{"source":"refundMethod","target":"refundMethod","type":"text"},{"source":"restockingFeePercentage","target":"restockingFeePercentage","type":"text"},{"source":"returnInstructions","target":"returnInstructions","type":"text"},{"source":"returnMethod","target":"returnMethod","type":"text"},{"source":"returnPeriod","target":"returnPeriod","type":"json"},{"source":"returnsAccepted","target":"returnsAccepted","type":"checkbox"},{"source":"returnShippingCostPayer","target":"returnShippingCostPayer","type":"text"}]);
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
