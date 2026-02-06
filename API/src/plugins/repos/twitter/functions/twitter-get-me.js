const { utils } = require("./utils");

module.exports = {
  async twitter_get_me(node, msg, inputs, opts) {
    const res = await utils.twitterRequest(opts, "/users/me", {
      query: { "user.fields": "id,name,username,description,profile_image_url,public_metrics,created_at" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data?.data || {};
    return {
      ok: true,
      id: r.id,
      name: r.name,
      username: r.username,
      description: r.description,
      profileImageUrl: r.profile_image_url,
      followers: r.public_metrics?.followers_count,
      following: r.public_metrics?.following_count,
      tweetCount: r.public_metrics?.tweet_count,
      createdAt: r.created_at
    };
  }
};
