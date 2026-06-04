const { utils } = require('./utils');

module.exports = {
  async mailgun_event_send_post_v1_alerts_settings_events(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/alerts/settings/events";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.event_type !== undefined && d.event_type !== null && d.event_type !== '') {
      body["event_type"] = d.event_type;
    }
    if (d.channel !== undefined && d.channel !== null && d.channel !== '') {
      body["channel"] = d.channel;
    }
    if (d.settings_url !== undefined && d.settings_url !== null && d.settings_url !== '') {
      if (!body["settings"] || typeof body["settings"] !== 'object' || Array.isArray(body["settings"])) body["settings"] = {};
      body["settings"]["url"] = d.settings_url;
    }
    if (d.settings_emails !== undefined && d.settings_emails !== null && d.settings_emails !== '') {
      body["settings_emails"] = d.settings_emails;
    }
    if (d.settings_channel_ids !== undefined && d.settings_channel_ids !== null && d.settings_channel_ids !== '') {
      body["settings_channel_ids"] = d.settings_channel_ids;
    }
    if (d.settings_disabled_channel_ids !== undefined && d.settings_disabled_channel_ids !== null && d.settings_disabled_channel_ids !== '') {
      if (!body["settings"] || typeof body["settings"] !== 'object' || Array.isArray(body["settings"])) body["settings"] = {};
      body["settings"]["disabled_channel_ids"] = d.settings_disabled_channel_ids;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

