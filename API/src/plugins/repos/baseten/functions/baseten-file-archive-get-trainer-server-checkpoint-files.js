const { utils } = require('./utils');

module.exports = {
  async baseten_file_archive_get_trainer_server_checkpoint_files(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/trainer_sessions/{session_id}/trainers/{trainer_id}/checkpoints/{checkpoint_id}/files";
    const session_id = String(d.session_id || '').trim();
    if (!session_id) return { ok: false, error: 'session_id requis.' };
    reqPath = reqPath.replace('{session_id}', encodeURIComponent(session_id));
    const trainer_id = String(d.trainer_id || '').trim();
    if (!trainer_id) return { ok: false, error: 'trainer_id requis.' };
    reqPath = reqPath.replace('{trainer_id}', encodeURIComponent(trainer_id));
    const checkpoint_id = String(d.checkpoint_id || '').trim();
    if (!checkpoint_id) return { ok: false, error: 'checkpoint_id requis.' };
    reqPath = reqPath.replace('{checkpoint_id}', encodeURIComponent(checkpoint_id));

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
