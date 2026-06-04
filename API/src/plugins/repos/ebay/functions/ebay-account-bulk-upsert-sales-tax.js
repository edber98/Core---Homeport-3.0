const { utils } = require('./utils');

module.exports = {
  async ebay_account_bulk_upsert_sales_tax(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/account/v1/bulk_create_or_replace_sales_tax";
    

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"salesTaxInputList","target":"salesTaxInputList","type":"text"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
