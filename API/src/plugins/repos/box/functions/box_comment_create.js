const { utils } = require("./utils");

module.exports = {
  async box_comment_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.fileId) return { ok: false, error: "ID du fichier requis." };
    if (!d.message) return { ok: false, error: "Message requis." };
    const res = await utils.boxRequest(opts, "POST", "/comments", { body: { item: { type: "file", id: String(d.fileId) }, message: d.message } });
    if (!res.ok) return res;
    const comment = res.data || {};
    return { ok: true, id: comment.id || "", message: comment.message || d.message, createdAt: comment.created_at || "", createdBy: comment.created_by?.name || "" };
  }
};
