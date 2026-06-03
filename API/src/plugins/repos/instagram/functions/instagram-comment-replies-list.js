const { utils } = require("./utils");

module.exports = {
  async instagram_comment_replies_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const commentId = String(d.commentId || "").trim();
    if (!commentId) return { ok: false, error: "ID du commentaire requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(commentId)}/replies`, {
      query: { fields: "id,text,username,timestamp,hidden", limit: parseInt(d.limit, 10) || 25, after: d.after }
    });
    if (!res.ok) return res;
    const comments = utils.listData(res.data).map(utils.mapComment);
    return { ok: true, comments, totalCount: String(comments.length), nextCursor: res.data?.paging?.cursors?.after || "" };
  }
};
