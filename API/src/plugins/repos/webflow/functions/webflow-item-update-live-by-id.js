const { utils } = require('./utils');

module.exports = {
  async webflow_item_update_live_by_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/collections/{collection_id}/items/{item_id}/live";
    const collection_id = String(d.collection_id || '').trim();
    if (!collection_id) return { ok: false, error: 'collection_id requis.' };
    reqPath = reqPath.replace('{collection_id}', encodeURIComponent(collection_id));
    const item_id = String(d.item_id || '').trim();
    if (!item_id) return { ok: false, error: 'item_id requis.' };
    reqPath = reqPath.replace('{item_id}', encodeURIComponent(item_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.limit = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.offset = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

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
      created_at: r.createdOn || r.created_at || r.createdAt || '',
      updated_at: r.lastUpdated || r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
