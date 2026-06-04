const { utils } = require('./utils');

module.exports = {
  async instantly_ai_create_createaienrichment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/supersearch-enrichment/ai";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.resource_id !== undefined && d.resource_id !== null && d.resource_id !== '') {
      body["resource_id"] = d.resource_id;
    }
    if (d.output_column !== undefined && d.output_column !== null && d.output_column !== '') {
      body["output_column"] = d.output_column;
    }
    if (d.resource_type !== undefined && d.resource_type !== null && d.resource_type !== '') {
      body["resource_type"] = d.resource_type;
    }
    if (d.input_columns !== undefined && d.input_columns !== null && d.input_columns !== '') {
      body["input_columns"] = d.input_columns;
    }
    if (d.model_version !== undefined && d.model_version !== null && d.model_version !== '') {
      body["model_version"] = d.model_version;
    }
    if (d.use_instantly_account !== undefined && d.use_instantly_account !== null && d.use_instantly_account !== '') {
      body["use_instantly_account"] = d.use_instantly_account;
    }
    if (d.overwrite !== undefined && d.overwrite !== null && d.overwrite !== '') {
      body["overwrite"] = d.overwrite;
    }
    if (d.auto_update !== undefined && d.auto_update !== null && d.auto_update !== '') {
      body["auto_update"] = d.auto_update;
    }
    if (d.skip_leads_without_email !== undefined && d.skip_leads_without_email !== null && d.skip_leads_without_email !== '') {
      body["skip_leads_without_email"] = d.skip_leads_without_email;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.prompt !== undefined && d.prompt !== null && d.prompt !== '') {
      body["prompt"] = d.prompt;
    }
    if (d.template_id !== undefined && d.template_id !== null && d.template_id !== '') {
      body["template_id"] = d.template_id;
    }
    if (d.status !== undefined && d.status !== null && d.status !== '') {
      body["status"] = d.status;
    }
    if (d.filters !== undefined && d.filters !== null && d.filters !== '') {
      body["filters"] = d.filters;
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

