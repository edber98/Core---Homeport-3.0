const { utils } = require('./utils');

module.exports = {
  async baseten_autoscaling_setting_update_updates_a_deployment_s_autoscaling_settings(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/models/{model_id}/deployments/{deployment_id}/autoscaling_settings";
    const model_id = String(d.model_id || '').trim();
    if (!model_id) return { ok: false, error: 'model_id requis.' };
    reqPath = reqPath.replace('{model_id}', encodeURIComponent(model_id));
    const deployment_id = String(d.deployment_id || '').trim();
    if (!deployment_id) return { ok: false, error: 'deployment_id requis.' };
    reqPath = reqPath.replace('{deployment_id}', encodeURIComponent(deployment_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'min_replica', 'max_replica', 'autoscaling_window', 'scale_down_delay', 'concurrency_target', 'target_utilization_percentage', 'target_in_flight_tokens', 'max_scale_down_rate']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "min_replica", "type": "integer"}, {"key": "max_replica", "type": "integer"}, {"key": "autoscaling_window", "type": "integer"}, {"key": "scale_down_delay", "type": "integer"}, {"key": "concurrency_target", "type": "integer"}, {"key": "target_utilization_percentage", "type": "integer"}, {"key": "target_in_flight_tokens", "type": "integer"}, {"key": "max_scale_down_rate", "type": "number"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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
