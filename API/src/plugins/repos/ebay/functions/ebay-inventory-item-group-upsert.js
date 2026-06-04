const { utils } = require('./utils');

module.exports = {
  async ebay_inventory_item_group_upsert(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/inventory_item_group/{inventoryItemGroupKey}";
    const inventoryitemgroupkey = String(d.inventoryitemgroupkey || '').trim();
    if (!inventoryitemgroupkey) return { ok: false, error: 'inventoryitemgroupkey requis.' };
    reqPath = reqPath.replace('{inventoryitemgroupkey}', encodeURIComponent(inventoryitemgroupkey));

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"aspects","target":"aspects","type":"text"},{"source":"description","target":"description","type":"text"},{"source":"imageUrls","target":"imageUrls","type":"json"},{"source":"inventoryItemGroupKey","target":"inventoryItemGroupKey","type":"text"},{"source":"subtitle","target":"subtitle","type":"text"},{"source":"title","target":"title","type":"text"},{"source":"variantSKUs","target":"variantSKUs","type":"json"},{"source":"variesBy","target":"variesBy","type":"json"},{"source":"videoIds","target":"videoIds","type":"json"}]);
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
