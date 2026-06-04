const { utils } = require('./utils');

module.exports = {
  async iterable_unsubscribe_create_unsubscribe(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/lists/unsubscribe";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.listid !== undefined && d.listid !== null && d.listid !== '') {
      body["listid"] = d.listid;
    }
    if (d.subscribers !== undefined && d.subscribers !== null && d.subscribers !== '') {
      body["subscribers"] = d.subscribers;
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

