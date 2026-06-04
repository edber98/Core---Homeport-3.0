const { utils } = require('./utils');

module.exports = {
  async iterable_update_create_updatesmstemplate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/templates/sms/update";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.templateid !== undefined && d.templateid !== null && d.templateid !== '') {
      body["templateid"] = d.templateid;
    }
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.preheadertext !== undefined && d.preheadertext !== null && d.preheadertext !== '') {
      body["preheadertext"] = d.preheadertext;
    }
    if (d.html !== undefined && d.html !== null && d.html !== '') {
      body["html"] = d.html;
    }
    if (d.plaintext !== undefined && d.plaintext !== null && d.plaintext !== '') {
      body["plaintext"] = d.plaintext;
    }
    if (d.fromname !== undefined && d.fromname !== null && d.fromname !== '') {
      body["fromname"] = d.fromname;
    }
    if (d.fromemail !== undefined && d.fromemail !== null && d.fromemail !== '') {
      body["fromemail"] = d.fromemail;
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

