const { utils } = require("./utils");

module.exports = {
  async wp_comment_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const commentId = (d.commentId || "").toString().trim();
    if (!commentId) return { ok: false, error: "Missing commentId." };

    const body = {};
    if (d.content) body.content = d.content;
    if (d.status) body.status = d.status;

    log('Mise à jour en cours...');
    const res = await utils.wpRequest(opts, `/comments/${encodeURIComponent(commentId)}`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), post: String(r.post || ""), author_name: r.author_name || "", author_email: r.author_email || "", content: r.content?.rendered || "", status: r.status || "", date: r.date };
  }
};
