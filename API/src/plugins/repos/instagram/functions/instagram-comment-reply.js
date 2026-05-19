const { utils } = require("./utils");

module.exports = {
  async instagram_comment_reply(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = String(d.commentId || "").trim();
    const message = String(d.message || "").trim();
    if (!commentId) return { ok: false, error: "ID du commentaire requis." };
    if (!message) return { ok: false, error: "Message requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(commentId)}/replies`, {
      method: "POST",
      body: { message }
    });
    if (!res.ok) return res;
    return { ok: true, id: res.data?.id || "", status: "created", message: "Réponse publiée." };
  }
};
