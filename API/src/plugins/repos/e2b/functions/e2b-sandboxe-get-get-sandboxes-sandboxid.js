const { utils } = require('./utils');

module.exports = {
  async e2b_sandboxe_get_get_sandboxes_sandboxid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/sandboxes/{sandboxID}";
    const sandboxid = String(d.sandboxid || '').trim();
    if (!sandboxid) return { ok: false, error: 'sandboxid requis.' };
    reqPath = reqPath.replace('{sandboxid}', encodeURIComponent(sandboxid));

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
