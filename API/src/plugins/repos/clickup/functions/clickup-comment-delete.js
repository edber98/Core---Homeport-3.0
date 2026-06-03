const { utils } = require("./utils");

module.exports = {
  async clickup_comment_delete(node, msg, inputs, opts) {
    const commentId = String((inputs || {}).commentId || "").trim();
    if (!commentId) return { ok: false, error: "Missing commentId." };
    const res = await utils.clickupRequest(opts, `/comment/${encodeURIComponent(commentId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: commentId, success: "true" };
  }
};
