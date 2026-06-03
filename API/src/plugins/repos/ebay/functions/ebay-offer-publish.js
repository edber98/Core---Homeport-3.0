const { utils } = require('./utils');

module.exports = {
  async ebay_offer_publish(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/offer/{offerId}/publish";
    const offerid = String(d.offerid || '').trim();
    if (!offerid) return { ok: false, error: 'offerid requis.' };
    reqPath = reqPath.replace('{offerid}', encodeURIComponent(offerid));

    const query = {};
    

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

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
