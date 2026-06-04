const { utils } = require('./utils');

module.exports = {
  async mailgun_whitelist_create_post_v3_domainid_whitelists(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/{domain_name}/whitelists";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.address !== undefined && d.address !== null && d.address !== '') {
      body["address"] = d.address;
    }
    if (d.domain !== undefined && d.domain !== null && d.domain !== '') {
      body["domain"] = d.domain;
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

