const { utils } = require('./utils');

module.exports = {
  async baseten_run_run_create_a_loops_run(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/loops/runs";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'session_id', 'base_model', 'max_seq_len', 'lora_rank', 'seed', 'scale_down_delay_seconds', 'path', 'reuse_from_session_id']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "session_id", "type": "string"}, {"key": "base_model", "type": "string"}, {"key": "max_seq_len", "type": "integer"}, {"key": "lora_rank", "type": "integer"}, {"key": "seed", "type": "integer"}, {"key": "scale_down_delay_seconds", "type": "integer"}, {"key": "path", "type": "string"}, {"key": "reuse_from_session_id", "type": "string"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
