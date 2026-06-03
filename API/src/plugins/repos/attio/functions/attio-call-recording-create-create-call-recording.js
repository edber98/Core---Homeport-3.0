const { utils } = require('./utils');

module.exports = {
  async attio_call_recording_create_create_call_recording(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/meetings/{meeting_id}/call_recordings";
    const meeting_id = String(d.meeting_id || '').trim();
    if (!meeting_id) return { ok: false, error: 'meeting_id requis.' };
    reqPath = reqPath.replace('{meeting_id}', encodeURIComponent(meeting_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.video_url !== undefined && d.video_url !== null && d.video_url !== '') payload.video_url = d.video_url;
    if (payload.video_url === undefined) return { ok: false, error: 'video_url requis.' };
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
