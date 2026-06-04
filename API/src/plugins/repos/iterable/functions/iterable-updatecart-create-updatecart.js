const { utils } = require('./utils');

module.exports = {
  async iterable_updatecart_create_updatecart(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/commerce/updateCart";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.user !== undefined && d.user !== null && d.user !== '') {
      body["user"] = d.user;
    }
    if (d.user_email !== undefined && d.user_email !== null && d.user_email !== '') {
      if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
      body["user"]["email"] = d.user_email;
    }
    if (d.user_userid !== undefined && d.user_userid !== null && d.user_userid !== '') {
      if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
      body["user"]["userid"] = d.user_userid;
    }
    if (d.items !== undefined && d.items !== null && d.items !== '') {
      body["items"] = d.items;
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

