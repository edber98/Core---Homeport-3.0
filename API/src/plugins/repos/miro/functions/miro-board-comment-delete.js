const { utils } = require("./utils");

module.exports = {
  async miro_board_comment_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = String(d.boardId || "").trim();
    const commentId = String(d.commentId || "").trim();
    if (!boardId) return { ok: false, error: "boardId requis." };
    if (!commentId) return { ok: false, error: "commentId requis." };

    const path = `/boards/${encodeURIComponent(boardId)}/comments/${encodeURIComponent(commentId)}`;
    const res = await utils.miroRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: commentId,
      name: "",
      status: "deleted",
      url: "",
      text: "Commentaire supprime.",
      result_json: utils.compactJson(res.data)
    };
  }
};
