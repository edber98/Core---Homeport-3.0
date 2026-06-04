const { utils } = require('./utils');

module.exports = {
  async mem0_memory_search_memories_search_v3(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/memories/search/";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.query !== undefined && d.query !== null && d.query !== '') {
      body["query"] = d.query;
    }
    if (d.filters !== undefined && d.filters !== null && d.filters !== '') {
      body["filters"] = d.filters;
    }
    if (d.top_k !== undefined && d.top_k !== null && d.top_k !== '') {
      body["top_k"] = d.top_k;
    }
    if (d.threshold !== undefined && d.threshold !== null && d.threshold !== '') {
      body["threshold"] = d.threshold;
    }
    if (d.rerank !== undefined && d.rerank !== null && d.rerank !== '') {
      body["rerank"] = d.rerank;
    }
    if (d.reference_date !== undefined && d.reference_date !== null && d.reference_date !== '') {
      body["reference_date"] = d.reference_date;
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


