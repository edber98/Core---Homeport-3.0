const { utils } = require('./utils');

module.exports = {
  async baseten_log_list_gets_the_logs_for_a_chainlet_within_a_chain_deployment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/chains/{chain_id}/deployments/{chain_deployment_id}/chainlets/{chainlet_id}/logs";
    const chain_id = String(d.chain_id || '').trim();
    if (!chain_id) return { ok: false, error: 'chain_id requis.' };
    reqPath = reqPath.replace('{chain_id}', encodeURIComponent(chain_id));
    const chain_deployment_id = String(d.chain_deployment_id || '').trim();
    if (!chain_deployment_id) return { ok: false, error: 'chain_deployment_id requis.' };
    reqPath = reqPath.replace('{chain_deployment_id}', encodeURIComponent(chain_deployment_id));
    const chainlet_id = String(d.chainlet_id || '').trim();
    if (!chainlet_id) return { ok: false, error: 'chainlet_id requis.' };
    reqPath = reqPath.replace('{chainlet_id}', encodeURIComponent(chainlet_id));

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
