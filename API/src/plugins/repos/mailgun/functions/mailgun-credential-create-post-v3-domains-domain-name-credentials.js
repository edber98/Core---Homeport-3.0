const { utils } = require('./utils');

module.exports = {
  async mailgun_credential_create_post_v3_domains_domain_name_credentials(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/domains/{domain_name}/credentials";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.login !== undefined && d.login !== null && d.login !== '') {
      body["login"] = d.login;
    }
    if (d.mailbox !== undefined && d.mailbox !== null && d.mailbox !== '') {
      body["mailbox"] = d.mailbox;
    }
    if (d.system !== undefined && d.system !== null && d.system !== '') {
      body["system"] = d.system;
    }
    if (d.password !== undefined && d.password !== null && d.password !== '') {
      body["password"] = d.password;
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

