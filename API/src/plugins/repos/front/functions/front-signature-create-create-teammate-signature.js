const { utils } = require('./utils');

module.exports = {
  async front_signature_create_create_teammate_signature(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teammates/{teammate_id}/signatures";
    const teammate_id = String(d.teammate_id || '').trim();
    if (!teammate_id) return { ok: false, error: 'teammate_id requis.' };
    reqPath = reqPath.replace('{teammate_id}', encodeURIComponent(teammate_id));

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
    if (d.is_default !== undefined && d.is_default !== null && d.is_default !== '') {
      body["is_default"] = d.is_default;
    }
    if (d.channel_ids !== undefined && d.channel_ids !== null && d.channel_ids !== '') {
      body["channel_ids"] = d.channel_ids;
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


