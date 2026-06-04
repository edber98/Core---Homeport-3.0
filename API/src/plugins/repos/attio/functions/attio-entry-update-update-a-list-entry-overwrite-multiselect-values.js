const { utils } = require('./utils');

module.exports = {
  async attio_entry_update_update_a_list_entry_overwrite_multiselect_values(node, msg, inputs, opts) {
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
    const payload = {};
    if (d.entry_values !== undefined && d.entry_values !== null && d.entry_values !== '') {
      try { payload.entry_values = utils.parseJsonInput(d.entry_values, 'entry_values', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (payload.entry_values === undefined) return { ok: false, error: 'entry_values requis.' };
    const body = { data: payload };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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
