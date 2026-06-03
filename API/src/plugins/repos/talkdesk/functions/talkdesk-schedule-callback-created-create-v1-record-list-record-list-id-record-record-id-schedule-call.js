const { utils } = require('./utils');

module.exports = {
  async talkdesk_schedule_callback_created_create_v1_record_list_record_list_id_record_record_id_schedule_call(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/record-list/{record_list_id}/record/{record_id}/schedule-callback-created";
    const record_list_id = String(d.record_list_id || '').trim();
    if (!record_list_id) return { ok: false, error: 'record_list_id requis.' };
    reqPath = reqPath.replace('{record_list_id}', encodeURIComponent(record_list_id));
    const record_id = String(d.record_id || '').trim();
    if (!record_id) return { ok: false, error: 'record_id requis.' };
    reqPath = reqPath.replace('{record_id}', encodeURIComponent(record_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

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
