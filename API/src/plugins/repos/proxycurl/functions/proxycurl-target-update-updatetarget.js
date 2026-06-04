const { utils } = require('./utils');

module.exports = {
  async proxycurl_target_update_updatetarget(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v1/monitor/feeds/{feed_id}/targets/{target_id}";
    const feed_id = String(d.feed_id || '').trim();
    if (!feed_id) return { ok: false, error: 'feed_id requis.' };
    reqPath = reqPath.replace('{feed_id}', encodeURIComponent(feed_id));
    const target_id = String(d.target_id || '').trim();
    if (!target_id) return { ok: false, error: 'target_id requis.' };
    reqPath = reqPath.replace('{target_id}', encodeURIComponent(target_id));

    const bodyFields = ['settings'];
    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['body', 'pageSize', 'page', 'search', 'feed_id', 'target_id', ...bodyFields]);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    let body;
    try { body = utils.bodyFromFields(d, bodyFields, ['settings']); } catch (e) { return { ok: false, error: e.message }; }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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
