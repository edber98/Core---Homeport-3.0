const { utils } = require('./utils');

module.exports = {
  async attio_webhook_webhook_update_a_webhook(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/webhooks/{webhook_id}";
    const webhook_id = String(d.webhook_id || '').trim();
    if (!webhook_id) return { ok: false, error: 'webhook_id requis.' };
    reqPath = reqPath.replace('{webhook_id}', encodeURIComponent(webhook_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.target_url !== undefined && d.target_url !== null && d.target_url !== '') payload.target_url = d.target_url;
    if (d.subscriptions !== undefined && d.subscriptions !== null && d.subscriptions !== '') {
      try { payload.subscriptions = utils.parseJsonInput(d.subscriptions, 'subscriptions', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!Object.keys(payload).length) return { ok: false, error: 'Aucun champ à envoyer.' };
    const body = { data: payload };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
