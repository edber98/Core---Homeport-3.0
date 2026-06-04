const { utils } = require('./utils');

module.exports = {
  async ebay_negotiation_offer_send_to_interested_buyers(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/negotiation/v1/send_offer_to_interested_buyers";
    

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"allowCounterOffer","target":"allowCounterOffer","type":"checkbox"},{"source":"message","target":"message","type":"text"},{"source":"offerDuration","target":"offerDuration","type":"json"},{"source":"offeredItems","target":"offeredItems","type":"json"}]);
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
