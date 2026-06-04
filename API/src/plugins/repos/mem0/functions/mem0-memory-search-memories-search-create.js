const { utils } = require('./utils');

module.exports = {
  async mem0_memory_search_memories_search_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/memories/search/";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.query !== undefined && d.query !== null && d.query !== '') {
      body["query"] = d.query;
    }
    if (d.agent_id !== undefined && d.agent_id !== null && d.agent_id !== '') {
      body["agent_id"] = d.agent_id;
    }
    if (d.user_id !== undefined && d.user_id !== null && d.user_id !== '') {
      body["user_id"] = d.user_id;
    }
    if (d.app_id !== undefined && d.app_id !== null && d.app_id !== '') {
      body["app_id"] = d.app_id;
    }
    if (d.run_id !== undefined && d.run_id !== null && d.run_id !== '') {
      body["run_id"] = d.run_id;
    }
    if (d.metadata !== undefined && d.metadata !== null && d.metadata !== '') {
      body["metadata"] = d.metadata;
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
    if (d.output_format !== undefined && d.output_format !== null && d.output_format !== '') {
      body["output_format"] = d.output_format;
    }
    if (d.org_id !== undefined && d.org_id !== null && d.org_id !== '') {
      body["org_id"] = d.org_id;
    }
    if (d.project_id !== undefined && d.project_id !== null && d.project_id !== '') {
      body["project_id"] = d.project_id;
    }
    if (d.filter_memories !== undefined && d.filter_memories !== null && d.filter_memories !== '') {
      body["filter_memories"] = d.filter_memories;
    }
    if (d.categories !== undefined && d.categories !== null && d.categories !== '') {
      body["categories"] = d.categories;
    }
    if (d.only_metadata_based_search !== undefined && d.only_metadata_based_search !== null && d.only_metadata_based_search !== '') {
      body["only_metadata_based_search"] = d.only_metadata_based_search;
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


