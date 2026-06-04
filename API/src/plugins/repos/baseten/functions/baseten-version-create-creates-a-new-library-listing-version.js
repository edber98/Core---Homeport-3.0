const { utils } = require('./utils');

module.exports = {
  async baseten_version_create_creates_a_new_library_listing_version(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/library_listings/{user_defined_listing_id}/versions";
    const user_defined_listing_id = String(d.user_defined_listing_id || '').trim();
    if (!user_defined_listing_id) return { ok: false, error: 'user_defined_listing_id requis.' };
    reqPath = reqPath.replace('{user_defined_listing_id}', encodeURIComponent(user_defined_listing_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(['pageSize', 'page', 'search', 'display_name', 'is_public', 'oracle_version_id', 'allow_truss_download', 'version_tag']);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const builtBody = utils.buildRequestBody(d, [{"key": "display_name", "type": "string"}, {"key": "is_public", "type": "boolean"}, {"key": "oracle_version_id", "type": "string"}, {"key": "allow_truss_download", "type": "boolean"}, {"key": "version_tag", "type": "string"}]);
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
