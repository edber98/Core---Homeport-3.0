const { utils } = require('./utils');

module.exports = {
  async mailgun_credential_update_put_v3_domains_domain_name_credentials_spec(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/domains/{domain_name}/credentials/{spec}";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));
    const spec = String(d.spec || '').trim();
    if (!spec) return { ok: false, error: 'spec requis.' };
    reqPath = reqPath.replace('{spec}', encodeURIComponent(spec));

    const query = {};

    const headers = {};

    const body = {};
    if (d.password !== undefined && d.password !== null && d.password !== '') {
      body["password"] = d.password;
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

