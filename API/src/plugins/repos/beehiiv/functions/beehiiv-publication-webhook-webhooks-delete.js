const { utils } = require('./utils');

module.exports = {
  async beehiiv_publication_webhook_webhooks_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/publications/{publicationId}/webhooks/{endpointId}";
    const publicationid = String(d.publicationid || '').trim();
    if (!publicationid) return { ok: false, error: 'publicationid requis.' };
    reqPath = reqPath.replace('{publicationid}', encodeURIComponent(publicationid));
    const endpointid = String(d.endpointid || '').trim();
    if (!endpointid) return { ok: false, error: 'endpointid requis.' };
    reqPath = reqPath.replace('{endpointid}', encodeURIComponent(endpointid));

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
