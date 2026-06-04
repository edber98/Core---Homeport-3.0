const { utils } = require('./utils');

module.exports = {
  async mailgun_list_create_post_v3_lists(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/lists";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.address !== undefined && d.address !== null && d.address !== '') {
      body["address"] = d.address;
    }
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.access_level !== undefined && d.access_level !== null && d.access_level !== '') {
      body["access_level"] = d.access_level;
    }
    if (d.reply_preference !== undefined && d.reply_preference !== null && d.reply_preference !== '') {
      body["reply_preference"] = d.reply_preference;
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

