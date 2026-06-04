const { utils } = require('./utils');

module.exports = {
  async front_recording_send_add_call_recording(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/calls/{external_call_id}/recording";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));
    const external_call_id = String(d.external_call_id || '').trim();
    if (!external_call_id) return { ok: false, error: 'external_call_id requis.' };
    reqPath = reqPath.replace('{external_call_id}', encodeURIComponent(external_call_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.attachments !== undefined && d.attachments !== null && d.attachments !== '') {
      body["attachments"] = d.attachments;
    }
    if (d.recording_type !== undefined && d.recording_type !== null && d.recording_type !== '') {
      body["recording_type"] = d.recording_type;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

