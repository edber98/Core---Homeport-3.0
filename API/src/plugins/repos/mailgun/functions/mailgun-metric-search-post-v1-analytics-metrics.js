const { utils } = require('./utils');

module.exports = {
  async mailgun_metric_search_post_v1_analytics_metrics(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/analytics/metrics";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.start !== undefined && d.start !== null && d.start !== '') {
      body["start"] = d.start;
    }
    if (d.end !== undefined && d.end !== null && d.end !== '') {
      body["end"] = d.end;
    }
    if (d.resolution !== undefined && d.resolution !== null && d.resolution !== '') {
      body["resolution"] = d.resolution;
    }
    if (d.duration !== undefined && d.duration !== null && d.duration !== '') {
      body["duration"] = d.duration;
    }
    if (d.dimensions !== undefined && d.dimensions !== null && d.dimensions !== '') {
      body["dimensions"] = d.dimensions;
    }
    if (d.metrics !== undefined && d.metrics !== null && d.metrics !== '') {
      body["metrics"] = d.metrics;
    }
    if (d.filter_and !== undefined && d.filter_and !== null && d.filter_and !== '') {
      body["filter_and"] = d.filter_and;
    }
    if (d.include_subaccounts !== undefined && d.include_subaccounts !== null && d.include_subaccounts !== '') {
      body["include_subaccounts"] = d.include_subaccounts;
    }
    if (d.include_aggregates !== undefined && d.include_aggregates !== null && d.include_aggregates !== '') {
      body["include_aggregates"] = d.include_aggregates;
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

