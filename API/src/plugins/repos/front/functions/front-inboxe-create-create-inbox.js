const { utils } = require('./utils');

module.exports = {
  async front_inboxe_create_create_inbox(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/inboxes";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.teammate_ids !== undefined && d.teammate_ids !== null && d.teammate_ids !== '') {
      body["teammate_ids"] = d.teammate_ids;
    }
    if (d.is_public !== undefined && d.is_public !== null && d.is_public !== '') {
      body["is_public"] = d.is_public;
    }
    if (d.custom_fields !== undefined && d.custom_fields !== null && d.custom_fields !== '') {
      body["custom_fields"] = d.custom_fields;
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

