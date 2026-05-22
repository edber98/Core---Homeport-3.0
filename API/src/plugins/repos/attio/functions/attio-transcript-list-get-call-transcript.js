const { utils } = require('./utils');

module.exports = {
  async attio_transcript_list_get_call_transcript(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/meetings/{meeting_id}/call_recordings/{call_recording_id}/transcript";
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

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};
