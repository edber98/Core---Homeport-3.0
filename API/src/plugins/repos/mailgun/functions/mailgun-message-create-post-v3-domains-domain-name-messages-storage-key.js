const { utils } = require('./utils');

module.exports = {
  async mailgun_message_create_post_v3_domains_domain_name_messages_storage_key(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/domains/{domain_name}/messages/{storage_key}";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));
    const storage_key = String(d.storage_key || '').trim();
    if (!storage_key) return { ok: false, error: 'storage_key requis.' };
    reqPath = reqPath.replace('{storage_key}', encodeURIComponent(storage_key));

    const query = {};

    const headers = {};

    const body = {};
    if (d.to !== undefined && d.to !== null && d.to !== '') {
      body["to"] = d.to;
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

