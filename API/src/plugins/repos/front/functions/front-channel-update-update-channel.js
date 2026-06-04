const { utils } = require('./utils');

module.exports = {
  async front_channel_update_update_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.inbox_id !== undefined && d.inbox_id !== null && d.inbox_id !== '') {
      body["inbox_id"] = d.inbox_id;
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

