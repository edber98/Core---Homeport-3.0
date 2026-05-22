const { utils } = require('./utils');

module.exports = {
  async baseten_replica_delete_terminates_a_replica_in_a_deployment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/models/{model_id}/deployments/{deployment_id}/replicas/{replica_id}";
    const model_id = String(d.model_id || '').trim();
    if (!model_id) return { ok: false, error: 'model_id requis.' };
    reqPath = reqPath.replace('{model_id}', encodeURIComponent(model_id));
    const deployment_id = String(d.deployment_id || '').trim();
    if (!deployment_id) return { ok: false, error: 'deployment_id requis.' };
    reqPath = reqPath.replace('{deployment_id}', encodeURIComponent(deployment_id));
    const replica_id = String(d.replica_id || '').trim();
    if (!replica_id) return { ok: false, error: 'replica_id requis.' };
    reqPath = reqPath.replace('{replica_id}', encodeURIComponent(replica_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['body', 'pageSize', 'page', 'search']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
