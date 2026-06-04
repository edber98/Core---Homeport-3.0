const { utils } = require('./utils');

module.exports = {
  async customer_io_entity_create_entity(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/entity";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"type","target":"type","type":"string"},{"key":"identifiers","target":"identifiers","type":"object"},{"key":"action","target":"action","type":"string"},{"key":"timestamp","target":"timestamp","type":"number"},{"key":"customerAttributes","target":"attributes","type":"object"},{"key":"cioRelationships","target":"cio_relationships","type":"array"},{"key":"id","target":"id","type":"string"},{"key":"name","target":"name","type":"string"},{"key":"device","target":"device","type":"object"},{"key":"primary","target":"primary","type":"object"},{"key":"secondary","target":"secondary","type":"object"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
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
