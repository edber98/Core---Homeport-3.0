const { utils } = require('./utils');

module.exports = {
  async mailgun_limit_update_put_v1_thresholds_limits_name(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/thresholds/limits/{name}";
    const name = String(d.name || '').trim();
    if (!name) return { ok: false, error: 'name requis.' };
    reqPath = reqPath.replace('{name}', encodeURIComponent(name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.metric !== undefined && d.metric !== null && d.metric !== '') {
      body["metric"] = d.metric;
    }
    if (d.comparator !== undefined && d.comparator !== null && d.comparator !== '') {
      body["comparator"] = d.comparator;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.dimension !== undefined && d.dimension !== null && d.dimension !== '') {
      body["dimension"] = d.dimension;
    }
    if (d.filters !== undefined && d.filters !== null && d.filters !== '') {
      body["filters"] = d.filters;
    }
    if (d.period !== undefined && d.period !== null && d.period !== '') {
      body["period"] = d.period;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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

