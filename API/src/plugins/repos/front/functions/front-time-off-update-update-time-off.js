const { utils } = require('./utils');

module.exports = {
  async front_time_off_update_update_time_off(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/time_offs/{time_off_id}";
    const time_off_id = String(d.time_off_id || '').trim();
    if (!time_off_id) return { ok: false, error: 'time_off_id requis.' };
    reqPath = reqPath.replace('{time_off_id}', encodeURIComponent(time_off_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.start_at !== undefined && d.start_at !== null && d.start_at !== '') {
      body["start_at"] = d.start_at;
    }
    if (d.end_at !== undefined && d.end_at !== null && d.end_at !== '') {
      body["end_at"] = d.end_at;
    }
    if (d.auto_responder !== undefined && d.auto_responder !== null && d.auto_responder !== '') {
      body["auto_responder"] = d.auto_responder;
    }
    if (d.auto_responder_body !== undefined && d.auto_responder_body !== null && d.auto_responder_body !== '') {
      if (!body["auto_responder"] || typeof body["auto_responder"] !== 'object' || Array.isArray(body["auto_responder"])) body["auto_responder"] = {};
      body["auto_responder"]["body"] = d.auto_responder_body;
    }
    if (d.auto_responder_is_enabled !== undefined && d.auto_responder_is_enabled !== null && d.auto_responder_is_enabled !== '') {
      if (!body["auto_responder"] || typeof body["auto_responder"] !== 'object' || Array.isArray(body["auto_responder"])) body["auto_responder"] = {};
      body["auto_responder"]["is_enabled"] = d.auto_responder_is_enabled;
    }
    if (d.auto_responder_is_contacts_only !== undefined && d.auto_responder_is_contacts_only !== null && d.auto_responder_is_contacts_only !== '') {
      if (!body["auto_responder"] || typeof body["auto_responder"] !== 'object' || Array.isArray(body["auto_responder"])) body["auto_responder"] = {};
      body["auto_responder"]["is_contacts_only"] = d.auto_responder_is_contacts_only;
    }
    if (d.auto_responder_channel_ids !== undefined && d.auto_responder_channel_ids !== null && d.auto_responder_channel_ids !== '') {
      if (!body["auto_responder"] || typeof body["auto_responder"] !== 'object' || Array.isArray(body["auto_responder"])) body["auto_responder"] = {};
      body["auto_responder"]["channel_ids"] = d.auto_responder_channel_ids;
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

