const { utils } = require('./utils');

module.exports = {
  async lemlist_recording_transcript_delete_delete_activity_recording_transcript(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/activities/{activityId}/recording-transcript";
    const activityid = String(d.activityid || '').trim();
    if (!activityid) return { ok: false, error: 'activityid requis.' };
    reqPath = reqPath.replace('{activityid}', encodeURIComponent(activityid));

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
