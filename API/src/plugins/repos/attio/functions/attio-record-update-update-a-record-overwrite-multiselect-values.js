const { utils } = require('./utils');

module.exports = {
  async attio_record_update_update_a_record_overwrite_multiselect_values(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/objects/{object}/records/{record_id}";
    const object = String(d.object || '').trim();
    if (!object) return { ok: false, error: 'object requis.' };
    reqPath = reqPath.replace('{object}', encodeURIComponent(object));
    const record_id = String(d.record_id || '').trim();
    if (!record_id) return { ok: false, error: 'record_id requis.' };
    reqPath = reqPath.replace('{record_id}', encodeURIComponent(record_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.values !== undefined && d.values !== null && d.values !== '') {
      try { payload.values = utils.parseJsonInput(d.values, 'values', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (payload.values === undefined) return { ok: false, error: 'values requis.' };
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
