const { utils } = require("./utils");

module.exports = {
  async linear_comment_update(node, msg, inputs, opts) {
    const commentId = (inputs?.commentId || "").trim();
    const body = (inputs?.body || "").trim();
    if (!commentId) return { ok: false, error: "Missing commentId." };
    if (!body) return { ok: false, error: "Missing body." };

    const query = `mutation CommentUpdate($id: String!, $input: CommentUpdateInput!) { commentUpdate(id: $id, input: $input) { success comment { id body updatedAt user { name } } } }`;
    const res = await utils.linearQuery(opts, query, { id: commentId, input: { body } });
    if (!res.ok) return { ok: false, error: res.error };
    const c = res.data?.commentUpdate?.comment || {};
    return { ok: true, id: c.id || commentId, text: c.body || body, assignee: c.user?.name || "", issueType: "comment" };
  }
};
