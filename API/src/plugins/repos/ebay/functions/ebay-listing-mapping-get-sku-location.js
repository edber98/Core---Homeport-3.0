const { utils } = require('./utils');

module.exports = {
  async ebay_listing_mapping_get_sku_location(node, msg, inputs, opts) {
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
