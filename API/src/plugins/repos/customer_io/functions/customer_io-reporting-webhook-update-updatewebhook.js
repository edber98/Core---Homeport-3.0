const { utils } = require('./utils');

module.exports = {
  async customer_io_reporting_webhook_update_updatewebhook(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/reporting_webhooks/{webhook_id}";
    const webhook_id = String(d.webhook_id || '').trim();
    if (!webhook_id) return { ok: false, error: 'webhook_id requis.' };
    reqPath = reqPath.replace('{webhook_id}', encodeURIComponent(webhook_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"name","target":"name","type":"string"},{"key":"id","target":"id","type":"number"},{"key":"endpoint","target":"endpoint","type":"string"},{"key":"disabled","target":"disabled","type":"boolean"},{"key":"fullResolution","target":"full_resolution","type":"boolean"},{"key":"withContent","target":"with_content","type":"boolean"},{"key":"events","target":"events","type":"array"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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
