const { utils } = require('./utils');

module.exports = {
  async iterable_metadata_delete_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/metadata/{table}/{key}";
    const table = String(d.table || '').trim();
    if (!table) return { ok: false, error: 'table requis.' };
    reqPath = reqPath.replace('{table}', encodeURIComponent(table));
    const key = String(d.key || '').trim();
    if (!key) return { ok: false, error: 'key requis.' };
    reqPath = reqPath.replace('{key}', encodeURIComponent(key));

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
