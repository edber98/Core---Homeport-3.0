const { utils } = require('./utils');

module.exports = {
  async mailgun_analytic_tag_post_v1_analytics_tags(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/analytics/tags";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.pagination_sort !== undefined && d.pagination_sort !== null && d.pagination_sort !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["sort"] = d.pagination_sort;
    }
    if (d.pagination_skip !== undefined && d.pagination_skip !== null && d.pagination_skip !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["skip"] = d.pagination_skip;
    }
    if (d.pagination_limit !== undefined && d.pagination_limit !== null && d.pagination_limit !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["limit"] = d.pagination_limit;
    }
    if (d.pagination_total !== undefined && d.pagination_total !== null && d.pagination_total !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["total"] = d.pagination_total;
    }
    if (d.pagination_include_total !== undefined && d.pagination_include_total !== null && d.pagination_include_total !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["include_total"] = d.pagination_include_total;
    }
    if (d.include_subaccounts !== undefined && d.include_subaccounts !== null && d.include_subaccounts !== '') {
      body["include_subaccounts"] = d.include_subaccounts;
    }
    if (d.include_metrics !== undefined && d.include_metrics !== null && d.include_metrics !== '') {
      body["include_metrics"] = d.include_metrics;
    }
    if (d.tag !== undefined && d.tag !== null && d.tag !== '') {
      body["tag"] = d.tag;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

