const { utils } = require('./utils');

module.exports = {
  async webflow_page_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/pages/{page_id}";
    const page_id = String(d.page_id || '').trim();
    if (!page_id) return { ok: false, error: 'page_id requis.' };
    reqPath = reqPath.replace('{page_id}', encodeURIComponent(page_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.limit = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.offset = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

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
      created_at: r.createdOn || r.created_at || r.createdAt || '',
      updated_at: r.lastUpdated || r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
