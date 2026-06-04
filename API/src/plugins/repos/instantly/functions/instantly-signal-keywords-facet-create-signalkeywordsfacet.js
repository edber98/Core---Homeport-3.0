const { utils } = require('./utils');

module.exports = {
  async instantly_signal_keywords_facet_create_signalkeywordsfacet(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/supersearch-enrichment/signal-keywords-facet";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.category !== undefined && d.category !== null && d.category !== '') {
      body["category"] = d.category;
    }
    if (d.field !== undefined && d.field !== null && d.field !== '') {
      body["field"] = d.field;
    }
    if (d.prefix !== undefined && d.prefix !== null && d.prefix !== '') {
      body["prefix"] = d.prefix;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
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

