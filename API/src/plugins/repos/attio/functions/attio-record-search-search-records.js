const { utils } = require('./utils');

module.exports = {
  async attio_record_search_search_records(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/objects/records/search";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.query !== undefined && d.query !== null && d.query !== '') payload.query = d.query;
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      const parsed = Number(d.limit);
      if (Number.isNaN(parsed)) return { ok: false, error: 'limit invalide.' };
      payload.limit = parsed;
    }
    if (d.objects !== undefined && d.objects !== null && d.objects !== '') {
      try { payload.objects = utils.parseJsonInput(d.objects, 'objects', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.request_as !== undefined && d.request_as !== null && d.request_as !== '') {
      try { payload.request_as = utils.parseJsonInput(d.request_as, 'request_as', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (payload.query === undefined) return { ok: false, error: 'query requis.' };
    if (payload.objects === undefined) return { ok: false, error: 'objects requis.' };
    if (payload.request_as === undefined) return { ok: false, error: 'request_as requis.' };
    const body = payload;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const responsePayload = res.data || {};
    const rawItems = Array.isArray(responsePayload.items) ? responsePayload.items : Array.isArray(responsePayload.results) ? responsePayload.results : Array.isArray(responsePayload) ? responsePayload : [];
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
      totalCount: Number(responsePayload.total || responsePayload.count || items.length),
      nextCursor: responsePayload.next_cursor || responsePayload.next || null
    };
  }
};
