const { utils } = require('./utils');

module.exports = {
  async mem0_memory_create_memories_list_v2(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/memories/";
    

    const query = {};

    const headers = {};

    const body = {};
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
    if (d.fields !== undefined && d.fields !== null && d.fields !== '') {
      body["fields"] = d.fields;
    }
    if (d.page !== undefined && d.page !== null && d.page !== '') {
      body["page"] = d.page;
    }
    if (d.page_size !== undefined && d.page_size !== null && d.page_size !== '') {
      body["page_size"] = d.page_size;
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

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};

