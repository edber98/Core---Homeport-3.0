const { utils } = require('./utils');

module.exports = {
  async ebay_inventory_location_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/inventory/v1/location/{merchantLocationKey}/update_location_details";
    const merchantlocationkey = String(d.merchantlocationkey || '').trim();
    if (!merchantlocationkey) return { ok: false, error: 'merchantlocationkey requis.' };
    reqPath = reqPath.replace('{merchantlocationkey}', encodeURIComponent(merchantlocationkey));

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"location","target":"location","type":"json"},{"source":"locationAdditionalInformation","target":"locationAdditionalInformation","type":"text"},{"source":"locationInstructions","target":"locationInstructions","type":"text"},{"source":"locationTypes","target":"locationTypes","type":"json"},{"source":"locationWebUrl","target":"locationWebUrl","type":"text"},{"source":"name","target":"name","type":"text"},{"source":"operatingHours","target":"operatingHours","type":"json"},{"source":"phone","target":"phone","type":"text"},{"source":"specialHours","target":"specialHours","type":"json"},{"source":"timeZoneId","target":"timeZoneId","type":"text"},{"source":"fulfillmentCenterSpecifications","target":"fulfillmentCenterSpecifications","type":"json"}]);
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
