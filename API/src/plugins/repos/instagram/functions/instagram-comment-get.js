const { utils } = require("./utils");

module.exports = {
  async instagram_comment_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = String(d.commentId || "").trim();
    if (!commentId) return { ok: false, error: "ID du commentaire requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(commentId)}`, {
      query: { fields: "id,text,username,timestamp,hidden" }
    });
    if (!res.ok) return res;
    return { ok: true, comment: utils.mapComment(res.data || {}) };
  }
};
