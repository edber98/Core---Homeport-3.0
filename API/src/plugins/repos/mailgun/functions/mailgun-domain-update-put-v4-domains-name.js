const { utils } = require('./utils');

module.exports = {
  async mailgun_domain_update_put_v4_domains_name(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v4/domains/{name}";
    const name = String(d.name || '').trim();
    if (!name) return { ok: false, error: 'name requis.' };
    reqPath = reqPath.replace('{name}', encodeURIComponent(name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.archive_to !== undefined && d.archive_to !== null && d.archive_to !== '') {
      body["archive_to"] = d.archive_to;
    }
    if (d.mailfrom_host !== undefined && d.mailfrom_host !== null && d.mailfrom_host !== '') {
      body["mailfrom_host"] = d.mailfrom_host;
    }
    if (d.message_ttl !== undefined && d.message_ttl !== null && d.message_ttl !== '') {
      body["message_ttl"] = d.message_ttl;
    }
    if (d.require_tls !== undefined && d.require_tls !== null && d.require_tls !== '') {
      body["require_tls"] = d.require_tls;
    }
    if (d.skip_verification !== undefined && d.skip_verification !== null && d.skip_verification !== '') {
      body["skip_verification"] = d.skip_verification;
    }
    if (d.smtp_password !== undefined && d.smtp_password !== null && d.smtp_password !== '') {
      body["smtp_password"] = d.smtp_password;
    }
    if (d.spam_action !== undefined && d.spam_action !== null && d.spam_action !== '') {
      body["spam_action"] = d.spam_action;
    }
    if (d.use_automatic_sender_security !== undefined && d.use_automatic_sender_security !== null && d.use_automatic_sender_security !== '') {
      body["use_automatic_sender_security"] = d.use_automatic_sender_security;
    }
    if (d.webhooks_redact_pii !== undefined && d.webhooks_redact_pii !== null && d.webhooks_redact_pii !== '') {
      body["webhooks_redact_pii"] = d.webhooks_redact_pii;
    }
    if (d.web_scheme !== undefined && d.web_scheme !== null && d.web_scheme !== '') {
      body["web_scheme"] = d.web_scheme;
    }
    if (d.web_prefix !== undefined && d.web_prefix !== null && d.web_prefix !== '') {
      body["web_prefix"] = d.web_prefix;
    }
    if (d.wildcard !== undefined && d.wildcard !== null && d.wildcard !== '') {
      body["wildcard"] = d.wildcard;
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

