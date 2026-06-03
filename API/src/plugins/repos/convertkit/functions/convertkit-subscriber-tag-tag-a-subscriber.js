const { utils } = require('./utils');

module.exports = {
  async convertkit_subscriber_tag_tag_a_subscriber(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v4/tags/{tag_id}/subscribers/{id}";
    const tag_id = String(d.tag_id || '').trim();
    if (!tag_id) return { ok: false, error: 'tag_id requis.' };
    reqPath = reqPath.replace('{tag_id}', encodeURIComponent(tag_id));
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

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

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
