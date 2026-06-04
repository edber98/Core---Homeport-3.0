const { utils } = require('./utils');

module.exports = {
  async customer_io_track_send_track(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/track";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"userId","target":"userId","type":"string"},{"key":"type","target":"type","type":"string"},{"key":"event","target":"event","type":"string"},{"key":"properties","target":"properties","type":"object"},{"key":"integrations","target":"integrations","type":"object"},{"key":"messageId","target":"messageId","type":"string"},{"key":"receivedAt","target":"receivedAt","type":"string"},{"key":"sentAt","target":"sentAt","type":"string"},{"key":"originalTimestamp","target":"originalTimestamp","type":"string"},{"key":"timestamp","target":"timestamp","type":"string"},{"key":"version","target":"version","type":"number"},{"key":"context","target":"context","type":"object"},{"key":"anonymousId","target":"anonymousId","type":"string"},{"key":"groupId","target":"groupId","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
