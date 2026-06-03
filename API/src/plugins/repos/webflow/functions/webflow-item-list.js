const { utils } = require('./utils');

module.exports = {
  async webflow_item_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/collections/{collection_id}/items";
    const collection_id = String(d.collection_id || '').trim();
    if (!collection_id) return { ok: false, error: 'collection_id requis.' };
    reqPath = reqPath.replace('{collection_id}', encodeURIComponent(collection_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.limit = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.offset = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.fieldData?.name || r.fieldData?.title || r.name || r.title || ''),
      url: r && (r.fieldData?.slug || r.slug || r.url || r.html_url || ''),
      status: r && (r.isDraft !== undefined ? (r.isDraft ? 'draft' : 'published') : (r.status || r.state || '')),
      created_at: r && (r.createdOn || r.created_at || r.createdAt || ''),
      updated_at: r && (r.lastUpdated || r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};
