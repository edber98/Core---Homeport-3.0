const { utils } = require('./utils');

module.exports = {
  async customer_io_language_tag_updatebroadcastactionlanguage(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/broadcasts/{broadcast_id}/actions/{action_id}/language/{language}";
    const broadcast_id = String(d.broadcast_id || '').trim();
    if (!broadcast_id) return { ok: false, error: 'broadcast_id requis.' };
    reqPath = reqPath.replace('{broadcast_id}', encodeURIComponent(broadcast_id));
    const action_id = String(d.action_id || '').trim();
    if (!action_id) return { ok: false, error: 'action_id requis.' };
    reqPath = reqPath.replace('{action_id}', encodeURIComponent(action_id));
    const language = String(d.language || '').trim();
    if (!language) return { ok: false, error: 'language requis.' };
    reqPath = reqPath.replace('{language}', encodeURIComponent(language));

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
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
