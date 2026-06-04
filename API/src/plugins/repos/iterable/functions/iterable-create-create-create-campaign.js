const { utils } = require('./utils');

module.exports = {
  async iterable_create_create_create_campaign(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/campaigns/create";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.listids !== undefined && d.listids !== null && d.listids !== '') {
      body["listids"] = d.listids;
    }
    if (d.templateid !== undefined && d.templateid !== null && d.templateid !== '') {
      body["templateid"] = d.templateid;
    }
    if (d.suppressionlistids !== undefined && d.suppressionlistids !== null && d.suppressionlistids !== '') {
      body["suppressionlistids"] = d.suppressionlistids;
    }
    if (d.sendat !== undefined && d.sendat !== null && d.sendat !== '') {
      body["sendat"] = d.sendat;
    }
    if (d.datafields !== undefined && d.datafields !== null && d.datafields !== '') {
      body["datafields"] = d.datafields;
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

