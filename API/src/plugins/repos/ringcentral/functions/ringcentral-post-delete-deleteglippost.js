const { utils } = require('./utils');

module.exports = {
  async ringcentral_post_delete_deleteglippost(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/restapi/v1.0/glip/chats/{chatId}/posts/{postId}";
    const chatid = String(d.chatid || '').trim();
    if (!chatid) return { ok: false, error: 'chatid requis.' };
    reqPath = reqPath.replace('{chatid}', encodeURIComponent(chatid));
    const postid = String(d.postid || '').trim();
    if (!postid) return { ok: false, error: 'postid requis.' };
    reqPath = reqPath.replace('{postid}', encodeURIComponent(postid));

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
