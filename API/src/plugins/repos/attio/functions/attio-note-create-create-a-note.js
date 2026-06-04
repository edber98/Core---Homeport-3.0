const { utils } = require('./utils');

module.exports = {
  async attio_note_create_create_a_note(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/notes";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.parent_object !== undefined && d.parent_object !== null && d.parent_object !== '') payload.parent_object = d.parent_object;
    if (d.parent_record_id !== undefined && d.parent_record_id !== null && d.parent_record_id !== '') payload.parent_record_id = d.parent_record_id;
    if (d.title !== undefined && d.title !== null && d.title !== '') payload.title = d.title;
    if (d.format !== undefined && d.format !== null && d.format !== '') payload.format = d.format;
    if (d.content !== undefined && d.content !== null && d.content !== '') payload.content = d.content;
    if (d.created_at !== undefined && d.created_at !== null && d.created_at !== '') payload.created_at = d.created_at;
    if (d.meeting_id !== undefined && d.meeting_id !== null && d.meeting_id !== '') payload.meeting_id = d.meeting_id;
    if (payload.parent_object === undefined) return { ok: false, error: 'parent_object requis.' };
    if (payload.parent_record_id === undefined) return { ok: false, error: 'parent_record_id requis.' };
    if (payload.title === undefined) return { ok: false, error: 'title requis.' };
    if (payload.format === undefined) return { ok: false, error: 'format requis.' };
    if (payload.content === undefined) return { ok: false, error: 'content requis.' };
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
