const { utils } = require('./utils');

module.exports = {
  async mailgun_domain_webhook_put_v4_domains_domain_webhooks(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v4/domains/{domain}/webhooks";
    const domain = String(d.domain || '').trim();
    if (!domain) return { ok: false, error: 'domain requis.' };
    reqPath = reqPath.replace('{domain}', encodeURIComponent(domain));

    const query = {};

    const headers = {};

    const body = {};
    if (d.url !== undefined && d.url !== null && d.url !== '') {
      body["url"] = d.url;
    }
    if (d.event_types !== undefined && d.event_types !== null && d.event_types !== '') {
      body["event_types"] = d.event_types;
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

