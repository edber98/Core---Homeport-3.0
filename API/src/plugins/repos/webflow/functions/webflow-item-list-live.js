const { utils } = require('./utils');

module.exports = {
  async webflow_item_list_live(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = '/collections/{collection_id}/items/live';
    const collection_id = String(d.collection_id || '').trim();
    if (!collection_id) return { ok: false, error: 'collection_id requis.' };
    reqPath = reqPath.replace('{collection_id}', encodeURIComponent(collection_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.limit = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.offset = d.page;
    if (d.cmsLocaleId !== undefined && d.cmsLocaleId !== null && d.cmsLocaleId !== '') query.cmsLocaleId = d.cmsLocaleId;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.results)
        ? payload.results
        : [];

    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && ((r.fieldData && r.fieldData.name) || r.name || r.title || ''),
      url: r && ((r.fieldData && r.fieldData.slug) || r.slug || r.url || r.html_url || ''),
      status: r && (r.status || (r.isArchived ? 'archived' : (r.isDraft ? 'draft' : 'published')) || ''),
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
