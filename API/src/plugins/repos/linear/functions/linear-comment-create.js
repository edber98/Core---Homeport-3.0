const { utils } = require("./utils");

module.exports = {
  async linear_comment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const issueId = (d.issueId || "").trim();
    const body = (d.body || "").trim();
    if (!issueId) return { ok: false, error: "Missing issueId." };
    if (!body) return { ok: false, error: "Missing body." };

    const query = `mutation CommentCreate($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
        comment { id body createdAt user { name } }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { input: { issueId, body } });
    if (!res.ok) return { ok: false, error: res.error };

    const cc = (res.data && res.data.commentCreate) || {};
    if (!cc.success) return { ok: false, error: "Comment creation failed." };
    const c = cc.comment || {};
    return {
      ok: true, id: c.id || "", body: c.body || "",
      userName: c.user ? c.user.name : "", createdAt: c.createdAt || ""
    };
  }
};
