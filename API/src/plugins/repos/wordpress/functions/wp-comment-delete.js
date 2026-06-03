const { utils } = require("./utils");
module.exports = {
  async wp_comment_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = String(d.commentId || "").trim();
    if (!commentId) return { ok: false, error: "Missing commentId." };
    const res = await utils.wpRequest(opts, `/comments/${encodeURIComponent(commentId)}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Commentaire ${commentId} supprimé.` };
  }
};
