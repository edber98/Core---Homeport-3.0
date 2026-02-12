const { utils } = require("./utils");

module.exports = {
  async twitter_search_tweets(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = (d.query || "").trim();
    if (!query) return { ok: false, error: "Missing query." };
    const maxResults = parseInt(d.maxResults, 10) || 10;

    const res = await utils.twitterRequest(opts, "/tweets/search/recent", {
      query: {
        query,
        max_results: maxResults,
        "tweet.fields": "created_at,author_id,public_metrics,text,lang"
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const tweets = (r.data || []).map(t => ({
      id: t.id,
      text: t.text,
      authorId: t.author_id,
      createdAt: t.created_at,
      likes: t.public_metrics?.like_count,
      retweets: t.public_metrics?.retweet_count
    }));
    return { ok: true, tweets, totalCount: r.meta?.result_count || tweets.length, nextToken: r.meta?.next_token || "" };
  }
};
