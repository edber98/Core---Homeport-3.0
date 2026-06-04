const { utils } = require('./utils');

module.exports = {
  async mailgun_domain_webhook_put_v3_domains_domain_name_webhooks_webhook_name(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/domains/{domain_name}/webhooks/{webhook_name}";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));
    const webhook_name = String(d.webhook_name || '').trim();
    if (!webhook_name) return { ok: false, error: 'webhook_name requis.' };
    reqPath = reqPath.replace('{webhook_name}', encodeURIComponent(webhook_name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.url !== undefined && d.url !== null && d.url !== '') {
      body["url"] = d.url;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

