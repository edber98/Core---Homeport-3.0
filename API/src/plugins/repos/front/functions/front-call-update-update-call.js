const { utils } = require('./utils');

module.exports = {
  async front_call_update_update_call(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/calls/{external_call_id}";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));
    const external_call_id = String(d.external_call_id || '').trim();
    if (!external_call_id) return { ok: false, error: 'external_call_id requis.' };
    reqPath = reqPath.replace('{external_call_id}', encodeURIComponent(external_call_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.occurred_at !== undefined && d.occurred_at !== null && d.occurred_at !== '') {
      body["occurred_at"] = d.occurred_at;
    }
    if (d.call_status !== undefined && d.call_status !== null && d.call_status !== '') {
      body["call_status"] = d.call_status;
    }
    if (d.agent_email_address !== undefined && d.agent_email_address !== null && d.agent_email_address !== '') {
      body["agent_email_address"] = d.agent_email_address;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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

