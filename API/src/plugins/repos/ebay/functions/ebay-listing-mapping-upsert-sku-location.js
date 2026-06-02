const { utils } = require('./utils');

module.exports = {
  async ebay_listing_mapping_upsert_sku_location(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/listing/{listingId}/sku/{sku}/locations";
    const listingid = String(d.listingid || '').trim();
    if (!listingid) return { ok: false, error: 'listingid requis.' };
    reqPath = reqPath.replace('{listingid}', encodeURIComponent(listingid));
    const sku = String(d.sku || '').trim();
    if (!sku) return { ok: false, error: 'sku requis.' };
    reqPath = reqPath.replace('{sku}', encodeURIComponent(sku));

    const query = {};
    

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

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
