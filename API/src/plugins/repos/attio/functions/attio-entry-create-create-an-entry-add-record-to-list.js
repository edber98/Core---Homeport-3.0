const { utils } = require('./utils');

module.exports = {
  async attio_entry_create_create_an_entry_add_record_to_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/lists/{list}/entries";
    const list = String(d.list || '').trim();
    if (!list) return { ok: false, error: 'list requis.' };
    reqPath = reqPath.replace('{list}', encodeURIComponent(list));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.parent_record_id !== undefined && d.parent_record_id !== null && d.parent_record_id !== '') payload.parent_record_id = d.parent_record_id;
    if (d.parent_object !== undefined && d.parent_object !== null && d.parent_object !== '') payload.parent_object = d.parent_object;
    if (d.entry_values !== undefined && d.entry_values !== null && d.entry_values !== '') {
      try { payload.entry_values = utils.parseJsonInput(d.entry_values, 'entry_values', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (payload.parent_record_id === undefined) return { ok: false, error: 'parent_record_id requis.' };
    if (payload.parent_object === undefined) return { ok: false, error: 'parent_object requis.' };
    if (payload.entry_values === undefined) return { ok: false, error: 'entry_values requis.' };
    const body = { data: payload };

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
