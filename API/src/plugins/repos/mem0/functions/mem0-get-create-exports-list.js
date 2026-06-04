const { utils } = require('./utils');

module.exports = {
  async mem0_get_create_exports_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/exports/get";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.memory_export_id !== undefined && d.memory_export_id !== null && d.memory_export_id !== '') {
      body["memory_export_id"] = d.memory_export_id;
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

