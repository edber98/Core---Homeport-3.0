const { utils } = require("./utils");

module.exports = {
  async box_comment_delete(node, msg, inputs, opts) {
    const commentId = String((inputs && inputs.commentId) || "").trim();
    if (!commentId) return { ok: false, error: "ID commentaire requis." };

    const res = await utils.boxRequest(opts, "DELETE", `/comments/${encodeURIComponent(commentId)}`);
    if (!res.ok) return res;
    return { ok: true, id: commentId, type: "comment", name: "", size: 0, parentId: "", createdAt: "", modifiedAt: "", url: "" };
  }
};
