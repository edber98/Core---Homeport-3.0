const { utils } = require('./utils');

module.exports = {
  async baseten_sampler_create_create_a_sampling_server(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/trainer_sessions/{session_id}/samplers";
    const session_id = String(d.session_id || '').trim();
    if (!session_id) return { ok: false, error: 'session_id requis.' };
    reqPath = reqPath.replace('{session_id}', encodeURIComponent(session_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'model', 'max_seq_length', 'checkpoint_path']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "model", "type": "string"}, {"key": "max_seq_length", "type": "integer"}, {"key": "checkpoint_path", "type": "string"}]);
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
