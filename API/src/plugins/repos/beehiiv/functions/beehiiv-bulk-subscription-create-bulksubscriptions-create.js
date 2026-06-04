const { utils } = require('./utils');

module.exports = {
  async beehiiv_bulk_subscription_create_bulksubscriptions_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/publications/{publicationId}/bulk_subscriptions";
    const publicationid = String(d.publicationid || '').trim();
    if (!publicationid) return { ok: false, error: 'publicationid requis.' };
    reqPath = reqPath.replace('{publicationid}', encodeURIComponent(publicationid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const builtBody = utils.buildRequestBody(d, [{"key": "subscriptions", "bodyKey": "subscriptions", "type": "array"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

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
