const { utils } = require("./utils");

module.exports = {
  async linear_comment_delete(node, msg, inputs, opts) {
    const commentId = (inputs?.commentId || "").trim();
    if (!commentId) return { ok: false, error: "Missing commentId." };

    const query = `mutation CommentDelete($id: String!) { commentDelete(id: $id) { success } }`;
    const res = await utils.linearQuery(opts, query, { id: commentId });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, id: commentId, status: "deleted" };
  }
};
