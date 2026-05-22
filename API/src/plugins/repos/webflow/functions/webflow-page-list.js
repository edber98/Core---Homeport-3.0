const { utils } = require('./utils');

module.exports = {
  async webflow_page_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = '/sites/{site_id}/pages';
    const site_id = String(d.site_id || '').trim();
    if (!site_id) return { ok: false, error: 'site_id requis.' };
    reqPath = reqPath.replace('{site_id}', encodeURIComponent(site_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.limit = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.offset = d.page;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.pages)
      ? payload.pages
      : Array.isArray(payload.items)
        ? payload.items
        : [];

    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.title || r.displayName || r.name || ''),
      url: r && (r.slug || r.url || r.html_url || ''),
      status: r && (r.status || (r.archived ? 'archived' : (r.draft ? 'draft' : 'published')) || ''),
      created_at: r && (r.createdOn || r.created_at || r.createdAt || ''),
      updated_at: r && (r.lastUpdated || r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    const pagination = payload.pagination || {};
    const totalCount = Number(pagination.total !== undefined ? pagination.total : (payload.total || payload.count || items.length));
    const limit = Number(pagination.limit !== undefined ? pagination.limit : (query.limit || 0));
    const offset = Number(pagination.offset !== undefined ? pagination.offset : (query.offset || 0));
    const nextCursor = limit > 0 && offset + limit < totalCount ? String(offset + limit) : null;

    return {
      ok: true,
      items,
      totalCount,
      nextCursor
    };
  }
};
