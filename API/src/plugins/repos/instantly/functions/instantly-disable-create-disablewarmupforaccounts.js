const { utils } = require('./utils');

module.exports = {
  async instantly_disable_create_disablewarmupforaccounts(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/accounts/warmup/disable";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.emails !== undefined && d.emails !== null && d.emails !== '') {
      body["emails"] = d.emails;
    }
    if (d.include_all_emails !== undefined && d.include_all_emails !== null && d.include_all_emails !== '') {
      body["include_all_emails"] = d.include_all_emails;
    }
    if (d.excluded_emails !== undefined && d.excluded_emails !== null && d.excluded_emails !== '') {
      body["excluded_emails"] = d.excluded_emails;
    }
    if (d.filter !== undefined && d.filter !== null && d.filter !== '') {
      body["filter"] = d.filter;
    }
    if (d.filter_tag_id !== undefined && d.filter_tag_id !== null && d.filter_tag_id !== '') {
      if (!body["filter"] || typeof body["filter"] !== 'object' || Array.isArray(body["filter"])) body["filter"] = {};
      body["filter"]["tag_id"] = d.filter_tag_id;
    }
    if (d.filter_filter !== undefined && d.filter_filter !== null && d.filter_filter !== '') {
      if (!body["filter"] || typeof body["filter"] !== 'object' || Array.isArray(body["filter"])) body["filter"] = {};
      body["filter"]["filter"] = d.filter_filter;
    }
    if (d.search !== undefined && d.search !== null && d.search !== '') {
      body["search"] = d.search;
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

