const { utils } = require('./utils');

module.exports = {
  async mailgun_webhook_webhook_post_v1_webhooks(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/webhooks";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.event_types !== undefined && d.event_types !== null && d.event_types !== '') {
      body["event_types"] = d.event_types;
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

