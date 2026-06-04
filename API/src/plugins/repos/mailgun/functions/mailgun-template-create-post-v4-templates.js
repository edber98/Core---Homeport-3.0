const { utils } = require('./utils');

module.exports = {
  async mailgun_template_create_post_v4_templates(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v4/templates";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.createdby !== undefined && d.createdby !== null && d.createdby !== '') {
      body["createdby"] = d.createdby;
    }
    if (d.template !== undefined && d.template !== null && d.template !== '') {
      body["template"] = d.template;
    }
    if (d.tag !== undefined && d.tag !== null && d.tag !== '') {
      body["tag"] = d.tag;
    }
    if (d.comment !== undefined && d.comment !== null && d.comment !== '') {
      body["comment"] = d.comment;
    }
    if (d.headers !== undefined && d.headers !== null && d.headers !== '') {
      body["headers"] = d.headers;
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


