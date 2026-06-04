const { utils } = require('./utils');

module.exports = {
  async helpscout_customer_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/customers";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.id !== undefined && d.id !== null && d.id !== '') {
      body["id"] = d.id;
    }
    if (d.firstname !== undefined && d.firstname !== null && d.firstname !== '') {
      body["firstname"] = d.firstname;
    }
    if (d.lastname !== undefined && d.lastname !== null && d.lastname !== '') {
      body["lastname"] = d.lastname;
    }
    if (d.emails !== undefined && d.emails !== null && d.emails !== '') {
      body["emails"] = d.emails;
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

