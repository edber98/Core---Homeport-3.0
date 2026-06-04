const { utils } = require('./utils');

module.exports = {
  async front_account_create_create_account(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accounts";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.domains !== undefined && d.domains !== null && d.domains !== '') {
      body["domains"] = d.domains;
    }
    if (d.external_id !== undefined && d.external_id !== null && d.external_id !== '') {
      body["external_id"] = d.external_id;
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

