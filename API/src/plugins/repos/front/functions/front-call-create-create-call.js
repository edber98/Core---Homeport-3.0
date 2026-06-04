const { utils } = require('./utils');

module.exports = {
  async front_call_create_create_call(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/calls";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.external_call_id !== undefined && d.external_call_id !== null && d.external_call_id !== '') {
      body["external_call_id"] = d.external_call_id;
    }
    if (d.initial_status !== undefined && d.initial_status !== null && d.initial_status !== '') {
      body["initial_status"] = d.initial_status;
    }
    if (d.direction !== undefined && d.direction !== null && d.direction !== '') {
      body["direction"] = d.direction;
    }
    if (d.from !== undefined && d.from !== null && d.from !== '') {
      body["from"] = d.from;
    }
    if (d.from_handle !== undefined && d.from_handle !== null && d.from_handle !== '') {
      if (!body["from"] || typeof body["from"] !== 'object' || Array.isArray(body["from"])) body["from"] = {};
      body["from"]["handle"] = d.from_handle;
    }
    if (d.from_name !== undefined && d.from_name !== null && d.from_name !== '') {
      if (!body["from"] || typeof body["from"] !== 'object' || Array.isArray(body["from"])) body["from"] = {};
      body["from"]["name"] = d.from_name;
    }
    if (d.started_at !== undefined && d.started_at !== null && d.started_at !== '') {
      body["started_at"] = d.started_at;
    }
    if (d.parent_external_call_id !== undefined && d.parent_external_call_id !== null && d.parent_external_call_id !== '') {
      body["parent_external_call_id"] = d.parent_external_call_id;
    }
    if (d.agent_email_address !== undefined && d.agent_email_address !== null && d.agent_email_address !== '') {
      body["agent_email_address"] = d.agent_email_address;
    }
    if (d.to !== undefined && d.to !== null && d.to !== '') {
      body["to"] = d.to;
    }
    if (d.to_handle !== undefined && d.to_handle !== null && d.to_handle !== '') {
      if (!body["to"] || typeof body["to"] !== 'object' || Array.isArray(body["to"])) body["to"] = {};
      body["to"]["handle"] = d.to_handle;
    }
    if (d.to_name !== undefined && d.to_name !== null && d.to_name !== '') {
      if (!body["to"] || typeof body["to"] !== 'object' || Array.isArray(body["to"])) body["to"] = {};
      body["to"]["name"] = d.to_name;
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

