const { utils } = require('./utils');

module.exports = {
  async attio_value_search_list_record_attribute_values(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/objects/{object}/records/{record_id}/attributes/{attribute}/values";
    const object = String(d.object || '').trim();
    if (!object) return { ok: false, error: 'object requis.' };
    reqPath = reqPath.replace('{object}', encodeURIComponent(object));
    const record_id = String(d.record_id || '').trim();
    if (!record_id) return { ok: false, error: 'record_id requis.' };
    reqPath = reqPath.replace('{record_id}', encodeURIComponent(record_id));
    const attribute = String(d.attribute || '').trim();
    if (!attribute) return { ok: false, error: 'attribute requis.' };
    reqPath = reqPath.replace('{attribute}', encodeURIComponent(attribute));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
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
