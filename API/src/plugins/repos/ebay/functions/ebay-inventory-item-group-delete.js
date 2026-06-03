const { utils } = require('./utils');

module.exports = {
  async ebay_inventory_item_group_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/inventory_item_group/{inventoryItemGroupKey}";
    const inventoryitemgroupkey = String(d.inventoryitemgroupkey || '').trim();
    if (!inventoryitemgroupkey) return { ok: false, error: 'inventoryitemgroupkey requis.' };
    reqPath = reqPath.replace('{inventoryitemgroupkey}', encodeURIComponent(inventoryitemgroupkey));

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
