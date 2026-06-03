const { utils } = require("./utils");

module.exports = {
  async clickup_comment_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = String(d.commentId || "").trim();
    const commentText = String(d.commentText || "").trim();
    if (!commentId) return { ok: false, error: "Missing commentId." };
    if (!commentText) return { ok: false, error: "Missing commentText." };

    const res = await utils.clickupRequest(opts, `/comment/${encodeURIComponent(commentId)}`, { method: "PUT", body: { comment_text: commentText } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: String(r.id || commentId), comment_text: r.comment_text || commentText, user: r.user?.username || "", date: r.date || "" };
  }
};
