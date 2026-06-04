const { utils } = require('./utils');

module.exports = {
  async helpscout_webhook_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/webhooks";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.url !== undefined && d.url !== null && d.url !== '') {
      body["url"] = d.url;
    }
    if (d.events !== undefined && d.events !== null && d.events !== '') {
      body["events"] = d.events;
    }
    if (d.secret !== undefined && d.secret !== null && d.secret !== '') {
      body["secret"] = d.secret;
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

