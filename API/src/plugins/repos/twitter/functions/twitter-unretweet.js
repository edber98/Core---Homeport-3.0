const { utils } = require("./utils");
module.exports = {
  async twitter_unretweet(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = String(d.userId || "").trim();
    const tweetId = String(d.tweetId || "").trim();
    if (!userId) return { ok: false, error: "Missing userId." };
    if (!tweetId) return { ok: false, error: "Missing tweetId." };
    const res = await utils.twitterRequest(opts, `/users/${encodeURIComponent(userId)}/retweets/${encodeURIComponent(tweetId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, retweeted: false, tweetId };
  }
};
