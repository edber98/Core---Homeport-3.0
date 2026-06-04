const { utils } = require('./utils');

module.exports = {
  async baseten_promote_create_promotes_a_development_deployment_to_production(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/models/{model_id}/deployments/development/promote";
    const model_id = String(d.model_id || '').trim();
    if (!model_id) return { ok: false, error: 'model_id requis.' };
    reqPath = reqPath.replace('{model_id}', encodeURIComponent(model_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'scale_down_previous_production', 'preserve_env_instance_type']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "scale_down_previous_production", "type": "boolean"}, {"key": "preserve_env_instance_type", "type": "boolean"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

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
