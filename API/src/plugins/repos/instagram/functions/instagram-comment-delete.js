const { utils } = require("./utils");

module.exports = {
  async instagram_comment_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = String(d.commentId || "").trim();
    if (!commentId) return { ok: false, error: "ID du commentaire requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(commentId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return res;
    return { ok: true, status: 200, message: "Commentaire supprimé.", raw: res.data || null };
  }
};
