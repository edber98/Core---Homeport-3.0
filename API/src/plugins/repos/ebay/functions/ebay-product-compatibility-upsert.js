const { utils } = require('./utils');

module.exports = {
  async ebay_product_compatibility_upsert(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/inventory_item/{sku}/product_compatibility";
    const sku = String(d.sku || '').trim();
    if (!sku) return { ok: false, error: 'sku requis.' };
    reqPath = reqPath.replace('{sku}', encodeURIComponent(sku));

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"compatibleProducts","target":"compatibleProducts","type":"json"},{"source":"sku","target":"sku","type":"text"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

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
