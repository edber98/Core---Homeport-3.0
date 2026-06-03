const { utils } = require("./utils");

module.exports = {
  async miro_board_comment_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = String(d.boardId || "").trim();
    const commentId = String(d.commentId || "").trim();
    if (!boardId) return { ok: false, error: "boardId requis." };
    if (!commentId) return { ok: false, error: "commentId requis." };

    const path = `/boards/${encodeURIComponent(boardId)}/comments/${encodeURIComponent(commentId)}`;
    const res = await utils.miroRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data?.data || res.data || {};
    return {
      ok: true,
      id: String(r.id || commentId),
      name: r.createdBy?.name || "",
      status: r.type || "comment",
      url: r.links?.self || "",
      text: String(r.data?.content || r.text || ""),
      result_json: utils.compactJson(res.data)
    };
  }
};
