const { utils } = require('./utils');

module.exports = {
  async customer_io_identify_create_identify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/identify";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"userId","target":"userId","type":"string"},{"key":"anonymousId","target":"anonymousId","type":"string"},{"key":"type","target":"type","type":"string"},{"key":"traits","target":"traits","type":"object"},{"key":"integrations","target":"integrations","type":"object"},{"key":"messageId","target":"messageId","type":"string"},{"key":"receivedAt","target":"receivedAt","type":"string"},{"key":"sentAt","target":"sentAt","type":"string"},{"key":"originalTimestamp","target":"originalTimestamp","type":"string"},{"key":"timestamp","target":"timestamp","type":"string"},{"key":"version","target":"version","type":"number"},{"key":"context","target":"context","type":"object"}]);
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
