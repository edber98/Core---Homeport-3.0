const { utils } = require('./utils');

module.exports = {
  async iterable_trackpurchase_create_trackpurchase(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/commerce/trackPurchase";
    

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
    if (d.user_datafields !== undefined && d.user_datafields !== null && d.user_datafields !== '') {
      if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
      body["user"]["datafields"] = d.user_datafields;
    }
    if (d.items !== undefined && d.items !== null && d.items !== '') {
      body["items"] = d.items;
    }
    if (d.total !== undefined && d.total !== null && d.total !== '') {
      body["total"] = d.total;
    }
    if (d.createdat !== undefined && d.createdat !== null && d.createdat !== '') {
      body["createdat"] = d.createdat;
    }
    if (d.datafields !== undefined && d.datafields !== null && d.datafields !== '') {
      body["datafields"] = d.datafields;
    }
    if (d.campaignid !== undefined && d.campaignid !== null && d.campaignid !== '') {
      body["campaignid"] = d.campaignid;
    }
    if (d.templateid !== undefined && d.templateid !== null && d.templateid !== '') {
      body["templateid"] = d.templateid;
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

