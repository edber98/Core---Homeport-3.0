const { utils } = require('./utils');

module.exports = {
  async mailgun_log_create_post_v1_analytics_logs(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/analytics/logs";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.start !== undefined && d.start !== null && d.start !== '') {
      body["start"] = d.start;
    }
    if (d.end !== undefined && d.end !== null && d.end !== '') {
      body["end"] = d.end;
    }
    if (d.duration !== undefined && d.duration !== null && d.duration !== '') {
      body["duration"] = d.duration;
    }
    if (d.events !== undefined && d.events !== null && d.events !== '') {
      body["events"] = d.events;
    }
    if (d.metric_events !== undefined && d.metric_events !== null && d.metric_events !== '') {
      body["metric_events"] = d.metric_events;
    }
    if (d.filter_and !== undefined && d.filter_and !== null && d.filter_and !== '') {
      body["filter_and"] = d.filter_and;
    }
    if (d.include_subaccounts !== undefined && d.include_subaccounts !== null && d.include_subaccounts !== '') {
      body["include_subaccounts"] = d.include_subaccounts;
    }
    if (d.include_totals !== undefined && d.include_totals !== null && d.include_totals !== '') {
      body["include_totals"] = d.include_totals;
    }
    if (d.pagination_sort !== undefined && d.pagination_sort !== null && d.pagination_sort !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["sort"] = d.pagination_sort;
    }
    if (d.pagination_token !== undefined && d.pagination_token !== null && d.pagination_token !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["token"] = d.pagination_token;
    }
    if (d.pagination_limit !== undefined && d.pagination_limit !== null && d.pagination_limit !== '') {
      if (!body["pagination"] || typeof body["pagination"] !== 'object' || Array.isArray(body["pagination"])) body["pagination"] = {};
      body["pagination"]["limit"] = d.pagination_limit;
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

