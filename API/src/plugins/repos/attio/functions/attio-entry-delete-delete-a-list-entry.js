const { utils } = require('./utils');

module.exports = {
  async attio_entry_delete_delete_a_list_entry(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/lists/{list}/entries/{entry_id}";
    const list = String(d.list || '').trim();
    if (!list) return { ok: false, error: 'list requis.' };
    reqPath = reqPath.replace('{list}', encodeURIComponent(list));
    const entry_id = String(d.entry_id || '').trim();
    if (!entry_id) return { ok: false, error: 'entry_id requis.' };
    reqPath = reqPath.replace('{entry_id}', encodeURIComponent(entry_id));

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
