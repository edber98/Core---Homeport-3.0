const { utils } = require("./utils");

module.exports = {
  async linkedin_delete_comment(node, msg, inputs, opts) {
    const postUrn = (inputs?.postUrn || "").trim();
    const commentId = (inputs?.commentId || "").trim();
    if (!postUrn) return { ok: false, error: "Missing postUrn." };
    if (!commentId) return { ok: false, error: "Missing commentId." };

    const res = await utils.linkedinRequest(opts, `/socialActions/${encodeURIComponent(postUrn)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, postUrn, commentId, status: "deleted" };
  }
};
