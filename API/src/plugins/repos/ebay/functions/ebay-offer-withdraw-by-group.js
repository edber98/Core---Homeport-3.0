const { utils } = require('./utils');

module.exports = {
  async ebay_offer_withdraw_by_group(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/offer/withdraw_by_inventory_item_group";
    

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"inventoryItemGroupKey","target":"inventoryItemGroupKey","type":"text"},{"source":"marketplaceId","target":"marketplaceId","type":"text"}]);
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
