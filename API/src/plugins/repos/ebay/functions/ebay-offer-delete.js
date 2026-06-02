const { utils } = require('./utils');

module.exports = {
  async ebay_offer_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/offer/{offerId}";
    const offerid = String(d.offerid || '').trim();
    if (!offerid) return { ok: false, error: 'offerid requis.' };
    reqPath = reqPath.replace('{offerid}', encodeURIComponent(offerid));

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
