const { utils } = require('./utils');

module.exports = {
  async mailgun_route_update_put_v3_routes_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/routes/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.id !== undefined && d.id !== null && d.id !== '') {
      body["id"] = d.id;
    }
    if (d.priority !== undefined && d.priority !== null && d.priority !== '') {
      body["priority"] = d.priority;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.expression !== undefined && d.expression !== null && d.expression !== '') {
      body["expression"] = d.expression;
    }
    if (d.action !== undefined && d.action !== null && d.action !== '') {
      body["action"] = d.action;
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

