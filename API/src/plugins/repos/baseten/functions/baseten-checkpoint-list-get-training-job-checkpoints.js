const { utils } = require('./utils');

module.exports = {
  async baseten_checkpoint_list_get_training_job_checkpoints(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/training_projects/{training_project_id}/jobs/{training_job_id}/checkpoints";
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
    const reserved = new Set(['body', 'pageSize', 'page', 'search']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
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
