const { utils } = require('./utils');

module.exports = {
  async mem0_add_create_memories_add_v3(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/memories/add/";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.messages !== undefined && d.messages !== null && d.messages !== '') {
      body["messages"] = d.messages;
    }
    if (d.user_id !== undefined && d.user_id !== null && d.user_id !== '') {
      body["user_id"] = d.user_id;
    }
    if (d.agent_id !== undefined && d.agent_id !== null && d.agent_id !== '') {
      body["agent_id"] = d.agent_id;
    }
    if (d.run_id !== undefined && d.run_id !== null && d.run_id !== '') {
      body["run_id"] = d.run_id;
    }
    if (d.metadata !== undefined && d.metadata !== null && d.metadata !== '') {
      body["metadata"] = d.metadata;
    }
    if (d.custom_instructions !== undefined && d.custom_instructions !== null && d.custom_instructions !== '') {
      body["custom_instructions"] = d.custom_instructions;
    }
    if (d.infer !== undefined && d.infer !== null && d.infer !== '') {
      body["infer"] = d.infer;
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

