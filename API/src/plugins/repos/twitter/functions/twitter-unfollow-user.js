const { utils } = require("./utils");

module.exports = {
  async twitter_unfollow_user(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = (d.userId || "").trim();
    if (!userId) return { ok: false, error: "Missing userId (your user ID)." };
    const targetUserId = (d.targetUserId || "").trim();
    if (!targetUserId) return { ok: false, error: "Missing targetUserId." };

    const res = await utils.twitterRequest(opts, `/users/${encodeURIComponent(userId)}/following/${encodeURIComponent(targetUserId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, unfollowed: true, targetUserId };
  }
};
