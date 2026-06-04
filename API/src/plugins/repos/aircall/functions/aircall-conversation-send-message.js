const { utils } = require('./utils');

module.exports = {
  async aircall_conversation_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/conversations/{id}/messages";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let mediaUrl;
    if (d.mediaUrl !== undefined && d.mediaUrl !== null && d.mediaUrl !== '') {
      if (typeof d.mediaUrl === 'object') mediaUrl = d.mediaUrl;
      else {
        try { mediaUrl = JSON.parse(String(d.mediaUrl)); } catch { return { ok: false, error: 'JSON invalide dans mediaUrl.' }; }
      }
      if (!Array.isArray(mediaUrl)) return { ok: false, error: 'mediaUrl doit être un tableau JSON.' };
    }

    const body = {};
    if (d.to !== undefined && d.to !== null && d.to !== '') body.to = d.to;
    if (d.body !== undefined && d.body !== null && d.body !== '') body.body = d.body;
    if (mediaUrl !== undefined) body.mediaUrl = mediaUrl;
    if (!body.to) return { ok: false, error: 'to requis.' };
    if (!body.body && !Array.isArray(body.mediaUrl)) return { ok: false, error: 'body ou mediaUrl requis.' };

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
