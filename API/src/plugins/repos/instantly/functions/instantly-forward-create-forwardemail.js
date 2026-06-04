const { utils } = require('./utils');

module.exports = {
  async instantly_forward_create_forwardemail(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/emails/forward";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.body_html !== undefined && d.body_html !== null && d.body_html !== '') {
      if (!body["body"] || typeof body["body"] !== 'object' || Array.isArray(body["body"])) body["body"] = {};
      body["body"]["html"] = d.body_html;
    }
    if (d.body_text !== undefined && d.body_text !== null && d.body_text !== '') {
      if (!body["body"] || typeof body["body"] !== 'object' || Array.isArray(body["body"])) body["body"] = {};
      body["body"]["text"] = d.body_text;
    }
    if (d.include_original_body !== undefined && d.include_original_body !== null && d.include_original_body !== '') {
      body["include_original_body"] = d.include_original_body;
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


