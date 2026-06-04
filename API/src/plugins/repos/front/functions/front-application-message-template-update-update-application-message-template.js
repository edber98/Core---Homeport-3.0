const { utils } = require('./utils');

module.exports = {
  async front_application_message_template_update_update_application_message_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/application_message_templates/{external_id}";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));
    const external_id = String(d.external_id || '').trim();
    if (!external_id) return { ok: false, error: 'external_id requis.' };
    reqPath = reqPath.replace('{external_id}', encodeURIComponent(external_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.blurb !== undefined && d.blurb !== null && d.blurb !== '') {
      body["blurb"] = d.blurb;
    }
    if (d.is_disabled !== undefined && d.is_disabled !== null && d.is_disabled !== '') {
      body["is_disabled"] = d.is_disabled;
    }
    if (d.status_name !== undefined && d.status_name !== null && d.status_name !== '') {
      body["status_name"] = d.status_name;
    }
    if (d.variable_mappings !== undefined && d.variable_mappings !== null && d.variable_mappings !== '') {
      body["variable_mappings"] = d.variable_mappings;
    }
    if (d.template_preview !== undefined && d.template_preview !== null && d.template_preview !== '') {
      body["template_preview"] = d.template_preview;
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

