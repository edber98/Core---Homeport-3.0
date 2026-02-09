const { utils } = require("./utils");

module.exports = {
  async twitter_create_tweet(node, msg, inputs, opts) {
    const d = inputs || {};
    const text = (d.text || "").trim();
    if (!text) return { ok: false, error: "Missing text." };

    const body = { text };
    if (d.replyToId) body.reply = { in_reply_to_tweet_id: d.replyToId.trim() };
    if (d.quoteTweetId) body.quote_tweet_id = d.quoteTweetId.trim();

    const res = await utils.twitterRequest(opts, "/tweets", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data?.data || {};
    return { ok: true, id: r.id, text: r.text };
  }
};
