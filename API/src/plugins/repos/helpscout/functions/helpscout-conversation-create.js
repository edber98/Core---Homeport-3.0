const { utils } = require('./utils');

module.exports = {
  async helpscout_conversation_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/conversations";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.id !== undefined && d.id !== null && d.id !== '') {
      body["id"] = d.id;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.status !== undefined && d.status !== null && d.status !== '') {
      body["status"] = d.status;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }
    if (d.mailboxid !== undefined && d.mailboxid !== null && d.mailboxid !== '') {
      body["mailboxid"] = d.mailboxid;
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

