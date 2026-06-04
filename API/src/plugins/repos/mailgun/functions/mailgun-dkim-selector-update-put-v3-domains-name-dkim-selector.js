const { utils } = require('./utils');

module.exports = {
  async mailgun_dkim_selector_update_put_v3_domains_name_dkim_selector(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/domains/{name}/dkim_selector";
    const name = String(d.name || '').trim();
    if (!name) return { ok: false, error: 'name requis.' };
    reqPath = reqPath.replace('{name}', encodeURIComponent(name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.dkim_selector !== undefined && d.dkim_selector !== null && d.dkim_selector !== '') {
      body["dkim_selector"] = d.dkim_selector;
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

