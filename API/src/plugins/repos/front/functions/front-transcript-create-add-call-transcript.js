const { utils } = require('./utils');

module.exports = {
  async front_transcript_create_add_call_transcript(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/calls/{external_call_id}/transcript";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));
    const external_call_id = String(d.external_call_id || '').trim();
    if (!external_call_id) return { ok: false, error: 'external_call_id requis.' };
    reqPath = reqPath.replace('{external_call_id}', encodeURIComponent(external_call_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.lines !== undefined && d.lines !== null && d.lines !== '') {
      body["lines"] = d.lines;
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

