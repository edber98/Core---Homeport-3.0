const { utils } = require("./utils");

module.exports = {
  async twitter_list_user_tweets(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = (d.userId || "").trim();
    if (!userId) return { ok: false, error: "Missing userId." };
    const maxResults = parseInt(d.maxResults, 10) || 10;

    const res = await utils.twitterRequest(opts, `/users/${encodeURIComponent(userId)}/tweets`, {
      query: {
        max_results: maxResults,
        "tweet.fields": "created_at,public_metrics,text"
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const tweets = (r.data || []).map(t => ({
      id: t.id,
      text: t.text,
      createdAt: t.created_at,
      likes: t.public_metrics?.like_count,
      retweets: t.public_metrics?.retweet_count
    }));
    return { ok: true, tweets, totalCount: r.meta?.result_count || tweets.length, nextToken: r.meta?.next_token || "" };
  }
};
