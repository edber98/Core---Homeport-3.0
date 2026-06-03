const { utils } = require("./utils");
module.exports = {
  async twitter_unlike_tweet(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = String(d.userId || "").trim();
    const tweetId = String(d.tweetId || "").trim();
    if (!userId) return { ok: false, error: "Missing userId." };
    if (!tweetId) return { ok: false, error: "Missing tweetId." };
    const res = await utils.twitterRequest(opts, `/users/${encodeURIComponent(userId)}/likes/${encodeURIComponent(tweetId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, liked: false, tweetId };
  }
};
