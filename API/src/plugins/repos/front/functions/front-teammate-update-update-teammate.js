const { utils } = require('./utils');

module.exports = {
  async front_teammate_update_update_teammate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teammates/{teammate_id}";
    const teammate_id = String(d.teammate_id || '').trim();
    if (!teammate_id) return { ok: false, error: 'teammate_id requis.' };
    reqPath = reqPath.replace('{teammate_id}', encodeURIComponent(teammate_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.username !== undefined && d.username !== null && d.username !== '') {
      body["username"] = d.username;
    }
    if (d.first_name !== undefined && d.first_name !== null && d.first_name !== '') {
      body["first_name"] = d.first_name;
    }
    if (d.last_name !== undefined && d.last_name !== null && d.last_name !== '') {
      body["last_name"] = d.last_name;
    }
    if (d.is_available !== undefined && d.is_available !== null && d.is_available !== '') {
      body["is_available"] = d.is_available;
    }
    if (d.custom_fields !== undefined && d.custom_fields !== null && d.custom_fields !== '') {
      body["custom_fields"] = d.custom_fields;
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

