const { utils } = require('./utils');

module.exports = {
  async front_statu_update_update_external_message_status(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/conversations/{conv_ext_id}/messages/{message_ext_id}/status";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));
    const conv_ext_id = String(d.conv_ext_id || '').trim();
    if (!conv_ext_id) return { ok: false, error: 'conv_ext_id requis.' };
    reqPath = reqPath.replace('{conv_ext_id}', encodeURIComponent(conv_ext_id));
    const message_ext_id = String(d.message_ext_id || '').trim();
    if (!message_ext_id) return { ok: false, error: 'message_ext_id requis.' };
    reqPath = reqPath.replace('{message_ext_id}', encodeURIComponent(message_ext_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.status !== undefined && d.status !== null && d.status !== '') {
      body["status"] = d.status;
    }
    if (d.reason !== undefined && d.reason !== null && d.reason !== '') {
      body["reason"] = d.reason;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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

