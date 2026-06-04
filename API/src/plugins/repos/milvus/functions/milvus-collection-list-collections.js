const { utils } = require('./utils');

module.exports = {
  async milvus_collection_list_collections(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/vectordb/collections/list";
    

    const query = {};

    const headers = {};
    if (d.request_timeout !== undefined && d.request_timeout !== null && d.request_timeout !== '') headers["Request-Timeout"] = String(d.request_timeout);
    if (d.authorization !== undefined && d.authorization !== null && d.authorization !== '') headers["Authorization"] = String(d.authorization);

    const body = {};
    if (d.dbname !== undefined && d.dbname !== null && d.dbname !== '') {
      body["dbname"] = d.dbname;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};

