const { utils } = require('./utils');

module.exports = {
  async mailgun_webhook_webhook_delete_v1_webhooks_webhook_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/webhooks/{webhook_id}";
    const webhook_id = String(d.webhook_id || '').trim();
    if (!webhook_id) return { ok: false, error: 'webhook_id requis.' };
    reqPath = reqPath.replace('{webhook_id}', encodeURIComponent(webhook_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

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
