const { utils } = require('./utils');

module.exports = {
  async baseten_interactive_session_update_patch_an_interactive_session(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/training_projects/{training_project_id}/jobs/{training_job_id}/interactive_sessions/{session_id}";
    const training_project_id = String(d.training_project_id || '').trim();
    if (!training_project_id) return { ok: false, error: 'training_project_id requis.' };
    reqPath = reqPath.replace('{training_project_id}', encodeURIComponent(training_project_id));
    const training_job_id = String(d.training_job_id || '').trim();
    if (!training_job_id) return { ok: false, error: 'training_job_id requis.' };
    reqPath = reqPath.replace('{training_job_id}', encodeURIComponent(training_job_id));
    const session_id = String(d.session_id || '').trim();
    if (!session_id) return { ok: false, error: 'session_id requis.' };
    reqPath = reqPath.replace('{session_id}', encodeURIComponent(session_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'timeout_minutes', 'trigger']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "timeout_minutes", "type": "integer"}, {"key": "trigger", "type": "string"}]);
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
