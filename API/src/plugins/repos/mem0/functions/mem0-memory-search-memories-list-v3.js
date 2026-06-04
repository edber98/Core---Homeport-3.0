const { utils } = require('./utils');

module.exports = {
  async mem0_memory_search_memories_list_v3(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/memories/";
    

    const query = {};
    if (d.page !== undefined && d.page !== null && d.page !== '') query["page"] = d.page;
    if (d.page_size !== undefined && d.page_size !== null && d.page_size !== '') query["page_size"] = d.page_size;

    const headers = {};

    const body = {};
    if (d.filters !== undefined && d.filters !== null && d.filters !== '') {
      body["filters"] = d.filters;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
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

