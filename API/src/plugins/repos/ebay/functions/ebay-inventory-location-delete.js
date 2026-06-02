const { utils } = require('./utils');

module.exports = {
  async ebay_inventory_location_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/location/{merchantLocationKey}";
    const merchantlocationkey = String(d.merchantlocationkey || '').trim();
    if (!merchantlocationkey) return { ok: false, error: 'merchantlocationkey requis.' };
    reqPath = reqPath.replace('{merchantlocationkey}', encodeURIComponent(merchantlocationkey));

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
