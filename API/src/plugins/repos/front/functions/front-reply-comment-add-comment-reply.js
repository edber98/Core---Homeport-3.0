const { utils } = require('./utils');

module.exports = {
  async front_reply_comment_add_comment_reply(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/comments/{comment_id}/replies";
    const comment_id = String(d.comment_id || '').trim();
    if (!comment_id) return { ok: false, error: 'comment_id requis.' };
    reqPath = reqPath.replace('{comment_id}', encodeURIComponent(comment_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.author_id !== undefined && d.author_id !== null && d.author_id !== '') {
      body["author_id"] = d.author_id;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.is_pinned !== undefined && d.is_pinned !== null && d.is_pinned !== '') {
      body["is_pinned"] = d.is_pinned;
    }
    if (d.attachments !== undefined && d.attachments !== null && d.attachments !== '') {
      body["attachments"] = d.attachments;
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


