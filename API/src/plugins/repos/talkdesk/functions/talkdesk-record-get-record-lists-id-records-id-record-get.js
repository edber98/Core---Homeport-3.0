const { utils } = require('./utils');

module.exports = {
  async talkdesk_record_get_record_lists_id_records_id_record_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/record-lists/{id}/records/{id_record}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));
    const id_record = String(d.id_record || '').trim();
    if (!id_record) return { ok: false, error: 'id_record requis.' };
    reqPath = reqPath.replace('{id_record}', encodeURIComponent(id_record));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
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
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
