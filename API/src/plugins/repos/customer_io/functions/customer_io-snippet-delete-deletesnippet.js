const { utils } = require('./utils');

module.exports = {
  async customer_io_snippet_delete_deletesnippet(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/snippets/{snippet_name}";
    const snippet_name = String(d.snippet_name || '').trim();
    if (!snippet_name) return { ok: false, error: 'snippet_name requis.' };
    reqPath = reqPath.replace('{snippet_name}', encodeURIComponent(snippet_name));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
