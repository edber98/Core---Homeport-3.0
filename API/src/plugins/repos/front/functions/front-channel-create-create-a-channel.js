const { utils } = require('./utils');

module.exports = {
  async front_channel_create_create_a_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/inboxes/{inbox_id}/channels";
    const inbox_id = String(d.inbox_id || '').trim();
    if (!inbox_id) return { ok: false, error: 'inbox_id requis.' };
    reqPath = reqPath.replace('{inbox_id}', encodeURIComponent(inbox_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.settings !== undefined && d.settings !== null && d.settings !== '') {
      body["settings"] = d.settings;
    }
    if (d.settings_undo_send_time !== undefined && d.settings_undo_send_time !== null && d.settings_undo_send_time !== '') {
      if (!body["settings"] || typeof body["settings"] !== 'object' || Array.isArray(body["settings"])) body["settings"] = {};
      body["settings"]["undo_send_time"] = d.settings_undo_send_time;
    }
    if (d.settings_all_teammates_can_reply !== undefined && d.settings_all_teammates_can_reply !== null && d.settings_all_teammates_can_reply !== '') {
      if (!body["settings"] || typeof body["settings"] !== 'object' || Array.isArray(body["settings"])) body["settings"] = {};
      body["settings"]["all_teammates_can_reply"] = d.settings_all_teammates_can_reply;
    }
    if (d.settings_webhook_url !== undefined && d.settings_webhook_url !== null && d.settings_webhook_url !== '') {
      if (!body["settings"] || typeof body["settings"] !== 'object' || Array.isArray(body["settings"])) body["settings"] = {};
      body["settings"]["webhook_url"] = d.settings_webhook_url;
    }
    if (d.settings_sid !== undefined && d.settings_sid !== null && d.settings_sid !== '') {
      if (!body["settings"] || typeof body["settings"] !== 'object' || Array.isArray(body["settings"])) body["settings"] = {};
      body["settings"]["sid"] = d.settings_sid;
    }
    if (d.settings_auth_token !== undefined && d.settings_auth_token !== null && d.settings_auth_token !== '') {
      if (!body["settings"] || typeof body["settings"] !== 'object' || Array.isArray(body["settings"])) body["settings"] = {};
      body["settings"]["auth_token"] = d.settings_auth_token;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }
    if (d.send_as !== undefined && d.send_as !== null && d.send_as !== '') {
      body["send_as"] = d.send_as;
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

