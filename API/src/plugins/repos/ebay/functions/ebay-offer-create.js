const { utils } = require('./utils');

module.exports = {
  async ebay_offer_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/offer";
    

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"availableQuantity","target":"availableQuantity","type":"number"},{"source":"categoryId","target":"categoryId","type":"text"},{"source":"charity","target":"charity","type":"json"},{"source":"extendedProducerResponsibility","target":"extendedProducerResponsibility","type":"json"},{"source":"format","target":"format","type":"text"},{"source":"hideBuyerDetails","target":"hideBuyerDetails","type":"checkbox"},{"source":"includeCatalogProductDetails","target":"includeCatalogProductDetails","type":"checkbox"},{"source":"listingDescription","target":"listingDescription","type":"text"},{"source":"listingDuration","target":"listingDuration","type":"text"},{"source":"listingPolicies","target":"listingPolicies","type":"json"},{"source":"listingStartDate","target":"listingStartDate","type":"text"},{"source":"lotSize","target":"lotSize","type":"number"},{"source":"marketplaceId","target":"marketplaceId","type":"text"},{"source":"merchantLocationKey","target":"merchantLocationKey","type":"text"},{"source":"pricingSummary","target":"pricingSummary","type":"json"},{"source":"quantityLimitPerBuyer","target":"quantityLimitPerBuyer","type":"number"},{"source":"regulatory","target":"regulatory","type":"json"},{"source":"secondaryCategoryId","target":"secondaryCategoryId","type":"text"},{"source":"sku","target":"sku","type":"text"},{"source":"storeCategoryNames","target":"storeCategoryNames","type":"json"},{"source":"tax","target":"tax","type":"json"}]);
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
