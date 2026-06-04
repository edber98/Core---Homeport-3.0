const { utils } = require('./utils');

module.exports = {
  async milvus_entity_hybrid_search_entities(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/vectordb/entities/hybrid_search";
    

    const query = {};

    const headers = {};
    if (d.authorization !== undefined && d.authorization !== null && d.authorization !== '') headers["Authorization"] = String(d.authorization);

    const body = {};
    if (d.dbname !== undefined && d.dbname !== null && d.dbname !== '') {
      body["dbname"] = d.dbname;
    }
    if (d.collectionname !== undefined && d.collectionname !== null && d.collectionname !== '') {
      body["collectionname"] = d.collectionname;
    }
    if (d.partitionnames !== undefined && d.partitionnames !== null && d.partitionnames !== '') {
      body["partitionnames"] = d.partitionnames;
    }
    if (d.search_data !== undefined && d.search_data !== null && d.search_data !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["data"] = d.search_data;
    }
    if (d.search_annsfield !== undefined && d.search_annsfield !== null && d.search_annsfield !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["annsfield"] = d.search_annsfield;
    }
    if (d.search_filter !== undefined && d.search_filter !== null && d.search_filter !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["filter"] = d.search_filter;
    }
    if (d.search_groupingfield !== undefined && d.search_groupingfield !== null && d.search_groupingfield !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["groupingfield"] = d.search_groupingfield;
    }
    if (d.search_metrictype !== undefined && d.search_metrictype !== null && d.search_metrictype !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["metrictype"] = d.search_metrictype;
    }
    if (d.search_limit !== undefined && d.search_limit !== null && d.search_limit !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["limit"] = d.search_limit;
    }
    if (d.search_offset !== undefined && d.search_offset !== null && d.search_offset !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["offset"] = d.search_offset;
    }
    if (d.search_ignoregrowing !== undefined && d.search_ignoregrowing !== null && d.search_ignoregrowing !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      body["search"]["ignoregrowing"] = d.search_ignoregrowing;
    }
    if (d.search_params_radius !== undefined && d.search_params_radius !== null && d.search_params_radius !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      if (!body["search"]["params"] || typeof body["search"]["params"] !== 'object' || Array.isArray(body["search"]["params"])) body["search"]["params"] = {};
      body["search"]["params"]["radius"] = d.search_params_radius;
    }
    if (d.search_params_range_filter !== undefined && d.search_params_range_filter !== null && d.search_params_range_filter !== '') {
      if (!body["search"] || typeof body["search"] !== 'object' || Array.isArray(body["search"])) body["search"] = {};
      if (!body["search"]["params"] || typeof body["search"]["params"] !== 'object' || Array.isArray(body["search"]["params"])) body["search"]["params"] = {};
      body["search"]["params"]["range_filter"] = d.search_params_range_filter;
    }
    if (d.rerank_strategy !== undefined && d.rerank_strategy !== null && d.rerank_strategy !== '') {
      if (!body["rerank"] || typeof body["rerank"] !== 'object' || Array.isArray(body["rerank"])) body["rerank"] = {};
      body["rerank"]["strategy"] = d.rerank_strategy;
    }
    if (d.rerank_params_k !== undefined && d.rerank_params_k !== null && d.rerank_params_k !== '') {
      if (!body["rerank"] || typeof body["rerank"] !== 'object' || Array.isArray(body["rerank"])) body["rerank"] = {};
      if (!body["rerank"]["params"] || typeof body["rerank"]["params"] !== 'object' || Array.isArray(body["rerank"]["params"])) body["rerank"]["params"] = {};
      body["rerank"]["params"]["k"] = d.rerank_params_k;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.outputfields !== undefined && d.outputfields !== null && d.outputfields !== '') {
      body["outputfields"] = d.outputfields;
    }
    if (d.consistencylevel !== undefined && d.consistencylevel !== null && d.consistencylevel !== '') {
      body["consistencylevel"] = d.consistencylevel;
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

