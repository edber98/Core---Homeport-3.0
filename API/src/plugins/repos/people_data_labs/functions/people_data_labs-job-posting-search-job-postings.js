const { utils } = require('./utils');

module.exports = {
  async people_data_labs_job_posting_search_job_postings(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v5/job_posting/search";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.query !== undefined && d.query !== null && d.query !== '') {
      body["query"] = d.query;
    }
    if (d.sql !== undefined && d.sql !== null && d.sql !== '') {
      body["sql"] = d.sql;
    }
    if (d.size !== undefined && d.size !== null && d.size !== '') {
      body["size"] = d.size;
    }
    if (d.from !== undefined && d.from !== null && d.from !== '') {
      body["from"] = d.from;
    }
    if (d.scroll_token !== undefined && d.scroll_token !== null && d.scroll_token !== '') {
      body["scroll_token"] = d.scroll_token;
    }
    if (d.dataset !== undefined && d.dataset !== null && d.dataset !== '') {
      body["dataset"] = d.dataset;
    }
    if (d.titlecase !== undefined && d.titlecase !== null && d.titlecase !== '') {
      body["titlecase"] = d.titlecase;
    }
    if (d.data_include !== undefined && d.data_include !== null && d.data_include !== '') {
      body["data_include"] = d.data_include;
    }
    if (d.pretty !== undefined && d.pretty !== null && d.pretty !== '') {
      body["pretty"] = d.pretty;
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



