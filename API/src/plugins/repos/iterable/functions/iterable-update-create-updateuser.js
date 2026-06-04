const { utils } = require('./utils');

module.exports = {
  async iterable_update_create_updateuser(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/users/update";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.email !== undefined && d.email !== null && d.email !== '') {
      body["email"] = d.email;
    }
    if (d.userid !== undefined && d.userid !== null && d.userid !== '') {
      body["userid"] = d.userid;
    }
    if (d.datafields !== undefined && d.datafields !== null && d.datafields !== '') {
      body["datafields"] = d.datafields;
    }
    if (d.preferuserid !== undefined && d.preferuserid !== null && d.preferuserid !== '') {
      body["preferuserid"] = d.preferuserid;
    }
    if (d.mergenestedobjects !== undefined && d.mergenestedobjects !== null && d.mergenestedobjects !== '') {
      body["mergenestedobjects"] = d.mergenestedobjects;
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

