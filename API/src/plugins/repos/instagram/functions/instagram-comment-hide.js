const { utils } = require("./utils");

module.exports = {
  async instagram_comment_hide(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = String(d.commentId || "").trim();
    if (!commentId) return { ok: false, error: "ID du commentaire requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(commentId)}`, {
      method: "POST",
      body: { hide: d.hide !== false && d.hide !== "false" }
    });
    if (!res.ok) return res;
    return { ok: true, id: commentId, status: "updated", message: "Visibilité du commentaire mise à jour." };
  }
};
