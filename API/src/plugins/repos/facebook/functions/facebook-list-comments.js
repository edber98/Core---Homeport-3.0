const { utils } = require("./utils");

module.exports = {
  async facebook_list_comments(node, msg, inputs, opts) {
    const d = inputs || {};
    const postId = (d.postId || "").trim();
    if (!postId) return { ok: false, error: "Missing postId." };
    const limit = parseInt(d.limit, 10) || 25;

    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(postId)}/comments`, {
      query: { fields: "id,message,from,created_time", limit }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const comments = (r.data || []).map(c => ({
      id: c.id,
      message: c.message,
      from: c.from?.name,
      createdTime: c.created_time
    }));
    return { ok: true, comments };
  }
};
