const { utils } = require('./utils');

module.exports = {
  async baseten_stop_create_stop_a_training_job(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/training_projects/{training_project_id}/jobs/{training_job_id}/stop";
    const training_project_id = String(d.training_project_id || '').trim();
    if (!training_project_id) return { ok: false, error: 'training_project_id requis.' };
    reqPath = reqPath.replace('{training_project_id}', encodeURIComponent(training_project_id));
    const training_job_id = String(d.training_job_id || '').trim();
    if (!training_job_id) return { ok: false, error: 'training_job_id requis.' };
    reqPath = reqPath.replace('{training_job_id}', encodeURIComponent(training_job_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const body = undefined;

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
