const { utils } = require('./utils');

module.exports = {
  async mem0_memory_create_memories_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/memories/";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.messages !== undefined && d.messages !== null && d.messages !== '') {
      body["messages"] = d.messages;
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
    if (d.includes !== undefined && d.includes !== null && d.includes !== '') {
      body["includes"] = d.includes;
    }
    if (d.excludes !== undefined && d.excludes !== null && d.excludes !== '') {
      body["excludes"] = d.excludes;
    }
    if (d.infer !== undefined && d.infer !== null && d.infer !== '') {
      body["infer"] = d.infer;
    }
    if (d.output_format !== undefined && d.output_format !== null && d.output_format !== '') {
      body["output_format"] = d.output_format;
    }
    if (d.custom_categories !== undefined && d.custom_categories !== null && d.custom_categories !== '') {
      body["custom_categories"] = d.custom_categories;
    }
    if (d.custom_instructions !== undefined && d.custom_instructions !== null && d.custom_instructions !== '') {
      body["custom_instructions"] = d.custom_instructions;
    }
    if (d.immutable !== undefined && d.immutable !== null && d.immutable !== '') {
      body["immutable"] = d.immutable;
    }
    if (d.async_mode !== undefined && d.async_mode !== null && d.async_mode !== '') {
      body["async_mode"] = d.async_mode;
    }
    if (d.timestamp !== undefined && d.timestamp !== null && d.timestamp !== '') {
      body["timestamp"] = d.timestamp;
    }
    if (d.expiration_date !== undefined && d.expiration_date !== null && d.expiration_date !== '') {
      body["expiration_date"] = d.expiration_date;
    }
    if (d.org_id !== undefined && d.org_id !== null && d.org_id !== '') {
      body["org_id"] = d.org_id;
    }
    if (d.project_id !== undefined && d.project_id !== null && d.project_id !== '') {
      body["project_id"] = d.project_id;
    }
    if (d.version !== undefined && d.version !== null && d.version !== '') {
      body["version"] = d.version;
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

