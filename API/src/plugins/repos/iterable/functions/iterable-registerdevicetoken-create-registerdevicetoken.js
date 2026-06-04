const { utils } = require('./utils');

module.exports = {
  async iterable_registerdevicetoken_create_registerdevicetoken(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/users/registerDeviceToken";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.email !== undefined && d.email !== null && d.email !== '') {
      body["email"] = d.email;
    }
    if (d.device !== undefined && d.device !== null && d.device !== '') {
      body["device"] = d.device;
    }
    if (d.device_token !== undefined && d.device_token !== null && d.device_token !== '') {
      if (!body["device"] || typeof body["device"] !== 'object' || Array.isArray(body["device"])) body["device"] = {};
      body["device"]["token"] = d.device_token;
    }
    if (d.device_platform !== undefined && d.device_platform !== null && d.device_platform !== '') {
      if (!body["device"] || typeof body["device"] !== 'object' || Array.isArray(body["device"])) body["device"] = {};
      body["device"]["platform"] = d.device_platform;
    }
    if (d.device_applicationname !== undefined && d.device_applicationname !== null && d.device_applicationname !== '') {
      if (!body["device"] || typeof body["device"] !== 'object' || Array.isArray(body["device"])) body["device"] = {};
      body["device"]["applicationname"] = d.device_applicationname;
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

