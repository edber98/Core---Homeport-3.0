const { utils } = require('./utils');

module.exports = {
  async baseten_deployment_create_creates_a_new_bis_llm_deployment_version(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/llm_models/{model_id}/deployments";
    const model_id = String(d.model_id || '').trim();
    if (!model_id) return { ok: false, error: 'model_id requis.' };
    reqPath = reqPath.replace('{model_id}', encodeURIComponent(model_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'resources', 'llm_version', 'llm_config', 'environment_variables', 'model_metadata', 'autoscaling_settings', 'additional_autoscaling_config', 'metadata', 'weights']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "resources", "type": "object"}, {"key": "llm_version", "type": "string"}, {"key": "llm_config", "type": "object"}, {"key": "environment_variables", "type": "object"}, {"key": "model_metadata", "type": "object"}, {"key": "autoscaling_settings", "type": "object"}, {"key": "additional_autoscaling_config", "type": "object"}, {"key": "metadata", "type": "object"}, {"key": "weights", "type": "array"}]);
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
