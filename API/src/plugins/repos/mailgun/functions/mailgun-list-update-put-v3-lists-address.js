const { utils } = require('./utils');

module.exports = {
  async mailgun_list_update_put_v3_lists_address(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/lists/{list_address}";
    const list_address = String(d.list_address || '').trim();
    if (!list_address) return { ok: false, error: 'list_address requis.' };
    reqPath = reqPath.replace('{list_address}', encodeURIComponent(list_address));

    const query = {};

    const headers = {};

    const body = {};
    if (d.address !== undefined && d.address !== null && d.address !== '') {
      body["address"] = d.address;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.access_level !== undefined && d.access_level !== null && d.access_level !== '') {
      body["access_level"] = d.access_level;
    }
    if (d.reply_reference !== undefined && d.reply_reference !== null && d.reply_reference !== '') {
      body["reply_reference"] = d.reply_reference;
    }
    if (d.list_id !== undefined && d.list_id !== null && d.list_id !== '') {
      body["list_id"] = d.list_id;
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

