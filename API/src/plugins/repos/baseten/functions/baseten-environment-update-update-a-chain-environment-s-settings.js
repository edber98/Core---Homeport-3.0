const { utils } = require('./utils');

module.exports = {
  async baseten_environment_update_update_a_chain_environment_s_settings(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/chains/{chain_id}/environments/{env_name}";
    const chain_id = String(d.chain_id || '').trim();
    if (!chain_id) return { ok: false, error: 'chain_id requis.' };
    reqPath = reqPath.replace('{chain_id}', encodeURIComponent(chain_id));
    const env_name = String(d.env_name || '').trim();
    if (!env_name) return { ok: false, error: 'env_name requis.' };
    reqPath = reqPath.replace('{env_name}', encodeURIComponent(env_name));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'promotion_settings']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "promotion_settings", "type": "object"}]);
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
