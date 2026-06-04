const { utils } = require('./utils');

module.exports = {
  async front_link_create_create_link(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/links";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.link_ids !== undefined && d.link_ids !== null && d.link_ids !== '') {
      body["link_ids"] = d.link_ids;
    }
    if (d.link_external_urls !== undefined && d.link_external_urls !== null && d.link_external_urls !== '') {
      body["link_external_urls"] = d.link_external_urls;
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

