const { utils } = require('./utils');

module.exports = {
  async ebay_inventory_item_upsert(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/inventory_item/{sku}";
    const sku = String(d.sku || '').trim();
    if (!sku) return { ok: false, error: 'sku requis.' };
    reqPath = reqPath.replace('{sku}', encodeURIComponent(sku));

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"availability","target":"availability","type":"json"},{"source":"condition","target":"condition","type":"text"},{"source":"conditionDescription","target":"conditionDescription","type":"text"},{"source":"conditionDescriptors","target":"conditionDescriptors","type":"json"},{"source":"packageWeightAndSize","target":"packageWeightAndSize","type":"json"},{"source":"product","target":"product","type":"json"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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
