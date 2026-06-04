const { utils } = require('./utils');

module.exports = {
  async mailgun_domain_create_post_v4_domains(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v4/domains";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.archive_to !== undefined && d.archive_to !== null && d.archive_to !== '') {
      body["archive_to"] = d.archive_to;
    }
    if (d.dkim_host_name !== undefined && d.dkim_host_name !== null && d.dkim_host_name !== '') {
      body["dkim_host_name"] = d.dkim_host_name;
    }
    if (d.dkim_key_size !== undefined && d.dkim_key_size !== null && d.dkim_key_size !== '') {
      body["dkim_key_size"] = d.dkim_key_size;
    }
    if (d.dkim_selector !== undefined && d.dkim_selector !== null && d.dkim_selector !== '') {
      body["dkim_selector"] = d.dkim_selector;
    }
    if (d.encrypt_incoming_message !== undefined && d.encrypt_incoming_message !== null && d.encrypt_incoming_message !== '') {
      body["encrypt_incoming_message"] = d.encrypt_incoming_message;
    }
    if (d.force_dkim_authority !== undefined && d.force_dkim_authority !== null && d.force_dkim_authority !== '') {
      body["force_dkim_authority"] = d.force_dkim_authority;
    }
    if (d.force_root_dkim_host !== undefined && d.force_root_dkim_host !== null && d.force_root_dkim_host !== '') {
      body["force_root_dkim_host"] = d.force_root_dkim_host;
    }
    if (d.wildcard !== undefined && d.wildcard !== null && d.wildcard !== '') {
      body["wildcard"] = d.wildcard;
    }
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.pool_id !== undefined && d.pool_id !== null && d.pool_id !== '') {
      body["pool_id"] = d.pool_id;
    }
    if (d.ips !== undefined && d.ips !== null && d.ips !== '') {
      body["ips"] = d.ips;
    }
    if (d.require_tls !== undefined && d.require_tls !== null && d.require_tls !== '') {
      body["require_tls"] = d.require_tls;
    }
    if (d.skip_verification !== undefined && d.skip_verification !== null && d.skip_verification !== '') {
      body["skip_verification"] = d.skip_verification;
    }
    if (d.spam_action !== undefined && d.spam_action !== null && d.spam_action !== '') {
      body["spam_action"] = d.spam_action;
    }
    if (d.smtp_password !== undefined && d.smtp_password !== null && d.smtp_password !== '') {
      body["smtp_password"] = d.smtp_password;
    }
    if (d.use_automatic_sender_security !== undefined && d.use_automatic_sender_security !== null && d.use_automatic_sender_security !== '') {
      body["use_automatic_sender_security"] = d.use_automatic_sender_security;
    }
    if (d.webhooks_redact_pii !== undefined && d.webhooks_redact_pii !== null && d.webhooks_redact_pii !== '') {
      body["webhooks_redact_pii"] = d.webhooks_redact_pii;
    }
    if (d.web_prefix !== undefined && d.web_prefix !== null && d.web_prefix !== '') {
      body["web_prefix"] = d.web_prefix;
    }
    if (d.web_scheme !== undefined && d.web_scheme !== null && d.web_scheme !== '') {
      body["web_scheme"] = d.web_scheme;
    }
    if (d.message_ttl !== undefined && d.message_ttl !== null && d.message_ttl !== '') {
      body["message_ttl"] = d.message_ttl;
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

