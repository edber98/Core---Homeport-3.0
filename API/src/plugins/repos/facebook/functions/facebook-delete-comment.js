const { utils } = require("./utils");

module.exports = {
  async facebook_delete_comment(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = (d.commentId || "").trim();
    if (!commentId) return { ok: false, error: "Missing commentId." };

    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(commentId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, deleted: true, commentId };
  }
};
