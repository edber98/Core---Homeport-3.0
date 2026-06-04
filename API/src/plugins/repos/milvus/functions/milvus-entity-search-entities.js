const { utils } = require('./utils');

module.exports = {
  async milvus_entity_search_entities(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/vectordb/entities/search";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.dbname !== undefined && d.dbname !== null && d.dbname !== '') {
      body["dbname"] = d.dbname;
    }
    if (d.collectionname !== undefined && d.collectionname !== null && d.collectionname !== '') {
      body["collectionname"] = d.collectionname;
    }
    if (d.filter !== undefined && d.filter !== null && d.filter !== '') {
      body["filter"] = d.filter;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.offset !== undefined && d.offset !== null && d.offset !== '') {
      body["offset"] = d.offset;
    }
    if (d.outputfields !== undefined && d.outputfields !== null && d.outputfields !== '') {
      body["outputfields"] = d.outputfields;
    }
    if (d.vector !== undefined && d.vector !== null && d.vector !== '') {
      body["vector"] = d.vector;
    }
    if (d.params_radius !== undefined && d.params_radius !== null && d.params_radius !== '') {
      if (!body["params"] || typeof body["params"] !== 'object' || Array.isArray(body["params"])) body["params"] = {};
      body["params"]["radius"] = d.params_radius;
    }
    if (d.params_range_filter !== undefined && d.params_range_filter !== null && d.params_range_filter !== '') {
      if (!body["params"] || typeof body["params"] !== 'object' || Array.isArray(body["params"])) body["params"] = {};
      body["params"]["range_filter"] = d.params_range_filter;
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

