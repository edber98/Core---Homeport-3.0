const { utils } = require("./utils");

module.exports = {
  async twitter_list_tweets(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const listId = (d.listId || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };
    const maxResults = parseInt(d.maxResults, 10) || 10;

    log('Récupération de la liste...');
    const res = await utils.twitterRequest(opts, `/lists/${encodeURIComponent(listId)}/tweets`, {
      query: {
        max_results: maxResults,
        "tweet.fields": "created_at,author_id,public_metrics,text"
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
