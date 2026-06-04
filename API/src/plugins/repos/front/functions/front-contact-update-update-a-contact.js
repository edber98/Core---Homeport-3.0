const { utils } = require('./utils');

module.exports = {
  async front_contact_update_update_a_contact(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contacts/{contact_id}";
    const contact_id = String(d.contact_id || '').trim();
    if (!contact_id) return { ok: false, error: 'contact_id requis.' };
    reqPath = reqPath.replace('{contact_id}', encodeURIComponent(contact_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.avatar !== undefined && d.avatar !== null && d.avatar !== '') {
      body["avatar"] = d.avatar;
    }
    if (d.links !== undefined && d.links !== null && d.links !== '') {
      body["links"] = d.links;
    }
    if (d.group_names !== undefined && d.group_names !== null && d.group_names !== '') {
      body["group_names"] = d.group_names;
    }
    if (d.list_names !== undefined && d.list_names !== null && d.list_names !== '') {
      body["list_names"] = d.list_names;
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

