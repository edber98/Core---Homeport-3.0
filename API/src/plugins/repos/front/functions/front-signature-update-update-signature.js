const { utils } = require('./utils');

module.exports = {
  async front_signature_update_update_signature(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/signatures/{signature_id}";
    const signature_id = String(d.signature_id || '').trim();
    if (!signature_id) return { ok: false, error: 'signature_id requis.' };
    reqPath = reqPath.replace('{signature_id}', encodeURIComponent(signature_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.sender_info !== undefined && d.sender_info !== null && d.sender_info !== '') {
      body["sender_info"] = d.sender_info;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.is_visible_for_all_teammate_channels !== undefined && d.is_visible_for_all_teammate_channels !== null && d.is_visible_for_all_teammate_channels !== '') {
      body["is_visible_for_all_teammate_channels"] = d.is_visible_for_all_teammate_channels;
    }
    if (d.is_default !== undefined && d.is_default !== null && d.is_default !== '') {
      body["is_default"] = d.is_default;
    }
    if (d.channel_ids !== undefined && d.channel_ids !== null && d.channel_ids !== '') {
      body["channel_ids"] = d.channel_ids;
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


