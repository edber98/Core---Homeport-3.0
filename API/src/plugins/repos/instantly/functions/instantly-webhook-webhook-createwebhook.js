const { utils } = require('./utils');

module.exports = {
  async instantly_webhook_webhook_createwebhook(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/webhooks";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.campaign !== undefined && d.campaign !== null && d.campaign !== '') {
      body["campaign"] = d.campaign;
    }
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.target_hook_url !== undefined && d.target_hook_url !== null && d.target_hook_url !== '') {
      body["target_hook_url"] = d.target_hook_url;
    }
    if (d.event_type !== undefined && d.event_type !== null && d.event_type !== '') {
      body["event_type"] = d.event_type;
    }
    if (d.custom_interest_value !== undefined && d.custom_interest_value !== null && d.custom_interest_value !== '') {
      body["custom_interest_value"] = d.custom_interest_value;
    }
    if (d.headers !== undefined && d.headers !== null && d.headers !== '') {
      body["headers"] = d.headers;
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


