const { utils } = require('./utils');

module.exports = {
  async proxycurl_feed_delete_deletefeed(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v1/monitor/feeds/{feed_id}";
    const feed_id = String(d.feed_id || '').trim();
    if (!feed_id) return { ok: false, error: 'feed_id requis.' };
    reqPath = reqPath.replace('{feed_id}', encodeURIComponent(feed_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['body', 'pageSize', 'page', 'search']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

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
