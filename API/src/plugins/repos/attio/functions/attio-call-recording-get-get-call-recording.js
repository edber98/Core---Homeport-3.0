const { utils } = require('./utils');

module.exports = {
  async attio_call_recording_get_get_call_recording(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/meetings/{meeting_id}/call_recordings/{call_recording_id}";
    const meeting_id = String(d.meeting_id || '').trim();
    if (!meeting_id) return { ok: false, error: 'meeting_id requis.' };
    reqPath = reqPath.replace('{meeting_id}', encodeURIComponent(meeting_id));
    const call_recording_id = String(d.call_recording_id || '').trim();
    if (!call_recording_id) return { ok: false, error: 'call_recording_id requis.' };
    reqPath = reqPath.replace('{call_recording_id}', encodeURIComponent(call_recording_id));

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
