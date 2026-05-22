const { utils } = require('./utils');

module.exports = {
  async talkdesk_filter_list_industries_settings_configurations_service_type_type_id_filt(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/industries-settings/configurations/{service}/{type}/{type_id}/filter";
    const service = String(d.service || '').trim();
    if (!service) return { ok: false, error: 'service requis.' };
    reqPath = reqPath.replace('{service}', encodeURIComponent(service));
    const type = String(d.type || '').trim();
    if (!type) return { ok: false, error: 'type requis.' };
    reqPath = reqPath.replace('{type}', encodeURIComponent(type));
    const type_id = String(d.type_id || '').trim();
    if (!type_id) return { ok: false, error: 'type_id requis.' };
    reqPath = reqPath.replace('{type_id}', encodeURIComponent(type_id));

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
