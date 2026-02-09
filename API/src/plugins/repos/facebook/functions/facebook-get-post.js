const { utils } = require("./utils");

module.exports = {
  async facebook_get_post(node, msg, inputs, opts) {
    const d = inputs || {};
    const postId = (d.postId || "").trim();
    if (!postId) return { ok: false, error: "Missing postId." };

    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(postId)}`, {
      query: { fields: "id,message,created_time,from,type,permalink_url,shares,likes.summary(true),comments.summary(true)" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id,
      message: r.message,
      createdTime: r.created_time,
      from: r.from?.name,
      type: r.type,
      permalinkUrl: r.permalink_url,
      shares: r.shares?.count || 0,
      likes: r.likes?.summary?.total_count || 0,
      comments: r.comments?.summary?.total_count || 0
    };
  }
};
