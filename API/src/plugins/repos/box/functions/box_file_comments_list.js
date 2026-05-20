const { utils } = require("./utils");

module.exports = {
  async box_file_comments_list(node, msg, inputs, opts) {
    const fileId = String((inputs && inputs.fileId) || "").trim();
    if (!fileId) return { ok: false, error: "ID du fichier requis." };
    const res = await utils.boxRequest(opts, "GET", `/files/${encodeURIComponent(fileId)}/comments`);
    if (!res.ok) return res;
    const comments = utils.entries(res.data).map((comment) => ({ id: comment.id || "", message: comment.message || "", createdAt: comment.created_at || "", createdBy: comment.created_by?.name || "" }));
    return { ok: true, totalCount: String(comments.length), comments };
  }
};
