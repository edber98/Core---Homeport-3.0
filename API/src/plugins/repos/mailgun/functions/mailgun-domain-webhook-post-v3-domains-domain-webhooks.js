const { utils } = require('./utils');

module.exports = {
  async mailgun_domain_webhook_post_v3_domains_domain_webhooks(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/domains/{domain}/webhooks";
    const domain = String(d.domain || '').trim();
    if (!domain) return { ok: false, error: 'domain requis.' };
    reqPath = reqPath.replace('{domain}', encodeURIComponent(domain));

    const query = {};

    const headers = {};

    const body = {};
    if (d.id !== undefined && d.id !== null && d.id !== '') {
      body["id"] = d.id;
    }
    if (d.url !== undefined && d.url !== null && d.url !== '') {
      body["url"] = d.url;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

