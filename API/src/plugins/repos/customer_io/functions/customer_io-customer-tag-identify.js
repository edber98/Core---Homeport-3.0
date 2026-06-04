const { utils } = require('./utils');

module.exports = {
  async customer_io_customer_tag_identify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v1/customers/{identifier}";
    const identifier = String(d.identifier || '').trim();
    if (!identifier) return { ok: false, error: 'identifier requis.' };
    reqPath = reqPath.replace('{identifier}', encodeURIComponent(identifier));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"id","target":"id","type":"string"},{"key":"email","target":"email","type":"string"},{"key":"anonymousId","target":"anonymous_id","type":"string"},{"key":"createdAt","target":"created_at","type":"number"},{"key":"Timestamp","target":"_timestamp","type":"number"},{"key":"Update","target":"_update","type":"boolean"},{"key":"cioRelationships","target":"cio_relationships","type":"object"},{"key":"unsubscribed","target":"unsubscribed","type":"boolean"},{"key":"cioSubscriptionPreferences","target":"cio_subscription_preferences","type":"object"},{"key":"firstName","target":"first_name","type":"string"},{"key":"plan","target":"plan","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

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
