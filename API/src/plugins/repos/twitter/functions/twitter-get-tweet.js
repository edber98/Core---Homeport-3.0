const { utils } = require("./utils");

module.exports = {
  async twitter_get_tweet(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const tweetId = (d.tweetId || "").trim();
    if (!tweetId) return { ok: false, error: "Missing tweetId." };

    log('Récupération des données...');
    const res = await utils.twitterRequest(opts, `/tweets/${encodeURIComponent(tweetId)}`, {
      query: { "tweet.fields": "created_at,author_id,public_metrics,text,lang" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data?.data || {};
    return {
      ok: true,
      id: r.id,
      text: r.text,
      authorId: r.author_id,
      createdAt: r.created_at,
      lang: r.lang,
      likes: r.public_metrics?.like_count,
      retweets: r.public_metrics?.retweet_count,
      replies: r.public_metrics?.reply_count,
      impressions: r.public_metrics?.impression_count
    };
  }
};
