const { utils } = require('./utils');

module.exports = {
  async mem0_memory_search_memories_search_v2(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/memories/search/";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.query !== undefined && d.query !== null && d.query !== '') {
      body["query"] = d.query;
    }
    if (d.version !== undefined && d.version !== null && d.version !== '') {
      body["version"] = d.version;
    }
    if (d.filters_user_id !== undefined && d.filters_user_id !== null && d.filters_user_id !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      body["filters"]["user_id"] = d.filters_user_id;
    }
    if (d.filters_agent_id !== undefined && d.filters_agent_id !== null && d.filters_agent_id !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      body["filters"]["agent_id"] = d.filters_agent_id;
    }
    if (d.filters_app_id !== undefined && d.filters_app_id !== null && d.filters_app_id !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      body["filters"]["app_id"] = d.filters_app_id;
    }
    if (d.filters_run_id !== undefined && d.filters_run_id !== null && d.filters_run_id !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      body["filters"]["run_id"] = d.filters_run_id;
    }
    if (d.filters_created_at !== undefined && d.filters_created_at !== null && d.filters_created_at !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      body["filters"]["created_at"] = d.filters_created_at;
    }
    if (d.filters_updated_at !== undefined && d.filters_updated_at !== null && d.filters_updated_at !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      body["filters"]["updated_at"] = d.filters_updated_at;
    }
    if (d.filters_keywords_contains !== undefined && d.filters_keywords_contains !== null && d.filters_keywords_contains !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      if (!body["filters"]["keywords"] || typeof body["filters"]["keywords"] !== 'object' || Array.isArray(body["filters"]["keywords"])) body["filters"]["keywords"] = {};
      body["filters"]["keywords"]["contains"] = d.filters_keywords_contains;
    }
    if (d.filters_keywords_icontains !== undefined && d.filters_keywords_icontains !== null && d.filters_keywords_icontains !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      if (!body["filters"]["keywords"] || typeof body["filters"]["keywords"] !== 'object' || Array.isArray(body["filters"]["keywords"])) body["filters"]["keywords"] = {};
      body["filters"]["keywords"]["icontains"] = d.filters_keywords_icontains;
    }
    if (d.filters_categories_in !== undefined && d.filters_categories_in !== null && d.filters_categories_in !== '') {
      body["filters_categories_in"] = d.filters_categories_in;
    }
    if (d.filters_metadata !== undefined && d.filters_metadata !== null && d.filters_metadata !== '') {
      if (!body["filters"] || typeof body["filters"] !== 'object' || Array.isArray(body["filters"])) body["filters"] = {};
      body["filters"]["metadata"] = d.filters_metadata;
    }
    if (d.top_k !== undefined && d.top_k !== null && d.top_k !== '') {
      body["top_k"] = d.top_k;
    }
    if (d.fields !== undefined && d.fields !== null && d.fields !== '') {
      body["fields"] = d.fields;
    }
    if (d.rerank !== undefined && d.rerank !== null && d.rerank !== '') {
      body["rerank"] = d.rerank;
    }
    if (d.keyword_search !== undefined && d.keyword_search !== null && d.keyword_search !== '') {
      body["keyword_search"] = d.keyword_search;
    }
    if (d.filter_memories !== undefined && d.filter_memories !== null && d.filter_memories !== '') {
      body["filter_memories"] = d.filter_memories;
    }
    if (d.threshold !== undefined && d.threshold !== null && d.threshold !== '') {
      body["threshold"] = d.threshold;
    }
    if (d.org_id !== undefined && d.org_id !== null && d.org_id !== '') {
      body["org_id"] = d.org_id;
    }
    if (d.project_id !== undefined && d.project_id !== null && d.project_id !== '') {
      body["project_id"] = d.project_id;
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


