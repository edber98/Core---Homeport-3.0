const { utils } = require('./utils');

module.exports = {
  async mailgun_feature_update_put_v5_accounts_features(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v5/accounts/features";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.webhooks_redact_pii !== undefined && d.webhooks_redact_pii !== null && d.webhooks_redact_pii !== '') {
      body["webhooks_redact_pii"] = d.webhooks_redact_pii;
    }
    if (d.ai_insights !== undefined && d.ai_insights !== null && d.ai_insights !== '') {
      body["ai_insights"] = d.ai_insights;
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

