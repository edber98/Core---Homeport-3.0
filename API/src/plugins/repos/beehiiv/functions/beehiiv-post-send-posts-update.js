const { utils } = require('./utils');

module.exports = {
  async beehiiv_post_send_posts_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/publications/{publicationId}/posts/{postId}";
    const publicationid = String(d.publicationid || '').trim();
    if (!publicationid) return { ok: false, error: 'publicationid requis.' };
    reqPath = reqPath.replace('{publicationid}', encodeURIComponent(publicationid));
    const postid = String(d.postid || '').trim();
    if (!postid) return { ok: false, error: 'postid requis.' };
    reqPath = reqPath.replace('{postid}', encodeURIComponent(postid));

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
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
