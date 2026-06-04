const { utils } = require('./utils');

module.exports = {
  async instantly_account_create_createaccount(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/accounts";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.email !== undefined && d.email !== null && d.email !== '') {
      body["email"] = d.email;
    }
    if (d.first_name !== undefined && d.first_name !== null && d.first_name !== '') {
      body["first_name"] = d.first_name;
    }
    if (d.last_name !== undefined && d.last_name !== null && d.last_name !== '') {
      body["last_name"] = d.last_name;
    }
    if (d.warmup !== undefined && d.warmup !== null && d.warmup !== '') {
      body["warmup"] = d.warmup;
    }
    if (d.warmup_limit !== undefined && d.warmup_limit !== null && d.warmup_limit !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      body["warmup"]["limit"] = d.warmup_limit;
    }
    if (d.warmup_advanced !== undefined && d.warmup_advanced !== null && d.warmup_advanced !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      body["warmup"]["advanced"] = d.warmup_advanced;
    }
    if (d.warmup_advanced_warm_ctd !== undefined && d.warmup_advanced_warm_ctd !== null && d.warmup_advanced_warm_ctd !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      if (!body["warmup"]["advanced"] || typeof body["warmup"]["advanced"] !== 'object' || Array.isArray(body["warmup"]["advanced"])) body["warmup"]["advanced"] = {};
      body["warmup"]["advanced"]["warm_ctd"] = d.warmup_advanced_warm_ctd;
    }
    if (d.warmup_advanced_open_rate !== undefined && d.warmup_advanced_open_rate !== null && d.warmup_advanced_open_rate !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      if (!body["warmup"]["advanced"] || typeof body["warmup"]["advanced"] !== 'object' || Array.isArray(body["warmup"]["advanced"])) body["warmup"]["advanced"] = {};
      body["warmup"]["advanced"]["open_rate"] = d.warmup_advanced_open_rate;
    }
    if (d.warmup_advanced_important_rate !== undefined && d.warmup_advanced_important_rate !== null && d.warmup_advanced_important_rate !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      if (!body["warmup"]["advanced"] || typeof body["warmup"]["advanced"] !== 'object' || Array.isArray(body["warmup"]["advanced"])) body["warmup"]["advanced"] = {};
      body["warmup"]["advanced"]["important_rate"] = d.warmup_advanced_important_rate;
    }
    if (d.warmup_advanced_read_emulation !== undefined && d.warmup_advanced_read_emulation !== null && d.warmup_advanced_read_emulation !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      if (!body["warmup"]["advanced"] || typeof body["warmup"]["advanced"] !== 'object' || Array.isArray(body["warmup"]["advanced"])) body["warmup"]["advanced"] = {};
      body["warmup"]["advanced"]["read_emulation"] = d.warmup_advanced_read_emulation;
    }
    if (d.warmup_advanced_spam_save_rate !== undefined && d.warmup_advanced_spam_save_rate !== null && d.warmup_advanced_spam_save_rate !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      if (!body["warmup"]["advanced"] || typeof body["warmup"]["advanced"] !== 'object' || Array.isArray(body["warmup"]["advanced"])) body["warmup"]["advanced"] = {};
      body["warmup"]["advanced"]["spam_save_rate"] = d.warmup_advanced_spam_save_rate;
    }
    if (d.warmup_advanced_weekday_only !== undefined && d.warmup_advanced_weekday_only !== null && d.warmup_advanced_weekday_only !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      if (!body["warmup"]["advanced"] || typeof body["warmup"]["advanced"] !== 'object' || Array.isArray(body["warmup"]["advanced"])) body["warmup"]["advanced"] = {};
      body["warmup"]["advanced"]["weekday_only"] = d.warmup_advanced_weekday_only;
    }
    if (d.warmup_warmup_custom_ftag !== undefined && d.warmup_warmup_custom_ftag !== null && d.warmup_warmup_custom_ftag !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      body["warmup"]["warmup_custom_ftag"] = d.warmup_warmup_custom_ftag;
    }
    if (d.warmup_increment !== undefined && d.warmup_increment !== null && d.warmup_increment !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      body["warmup"]["increment"] = d.warmup_increment;
    }
    if (d.warmup_reply_rate !== undefined && d.warmup_reply_rate !== null && d.warmup_reply_rate !== '') {
      if (!body["warmup"] || typeof body["warmup"] !== 'object' || Array.isArray(body["warmup"])) body["warmup"] = {};
      body["warmup"]["reply_rate"] = d.warmup_reply_rate;
    }
    if (d.daily_limit !== undefined && d.daily_limit !== null && d.daily_limit !== '') {
      body["daily_limit"] = d.daily_limit;
    }
    if (d.tracking_domain_name !== undefined && d.tracking_domain_name !== null && d.tracking_domain_name !== '') {
      body["tracking_domain_name"] = d.tracking_domain_name;
    }
    if (d.tracking_domain_status !== undefined && d.tracking_domain_status !== null && d.tracking_domain_status !== '') {
      body["tracking_domain_status"] = d.tracking_domain_status;
    }
    if (d.enable_slow_ramp !== undefined && d.enable_slow_ramp !== null && d.enable_slow_ramp !== '') {
      body["enable_slow_ramp"] = d.enable_slow_ramp;
    }
    if (d.inbox_placement_test_limit !== undefined && d.inbox_placement_test_limit !== null && d.inbox_placement_test_limit !== '') {
      body["inbox_placement_test_limit"] = d.inbox_placement_test_limit;
    }
    if (d.provider_code !== undefined && d.provider_code !== null && d.provider_code !== '') {
      body["provider_code"] = d.provider_code;
    }
    if (d.sending_gap !== undefined && d.sending_gap !== null && d.sending_gap !== '') {
      body["sending_gap"] = d.sending_gap;
    }
    if (d.signature !== undefined && d.signature !== null && d.signature !== '') {
      body["signature"] = d.signature;
    }
    if (d.reply_to !== undefined && d.reply_to !== null && d.reply_to !== '') {
      body["reply_to"] = d.reply_to;
    }
    if (d.imap_username !== undefined && d.imap_username !== null && d.imap_username !== '') {
      body["imap_username"] = d.imap_username;
    }
    if (d.imap_password !== undefined && d.imap_password !== null && d.imap_password !== '') {
      body["imap_password"] = d.imap_password;
    }
    if (d.imap_host !== undefined && d.imap_host !== null && d.imap_host !== '') {
      body["imap_host"] = d.imap_host;
    }
    if (d.imap_port !== undefined && d.imap_port !== null && d.imap_port !== '') {
      body["imap_port"] = d.imap_port;
    }
    if (d.smtp_username !== undefined && d.smtp_username !== null && d.smtp_username !== '') {
      body["smtp_username"] = d.smtp_username;
    }
    if (d.smtp_password !== undefined && d.smtp_password !== null && d.smtp_password !== '') {
      body["smtp_password"] = d.smtp_password;
    }
    if (d.smtp_host !== undefined && d.smtp_host !== null && d.smtp_host !== '') {
      body["smtp_host"] = d.smtp_host;
    }
    if (d.smtp_port !== undefined && d.smtp_port !== null && d.smtp_port !== '') {
      body["smtp_port"] = d.smtp_port;
    }
    if (d.warmup_custom_ftag !== undefined && d.warmup_custom_ftag !== null && d.warmup_custom_ftag !== '') {
      body["warmup_custom_ftag"] = d.warmup_custom_ftag;
    }
    if (d.skip_cname_check !== undefined && d.skip_cname_check !== null && d.skip_cname_check !== '') {
      body["skip_cname_check"] = d.skip_cname_check;
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

