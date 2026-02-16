const { utils } = require("./utils");

module.exports = {
  async twitter_get_user(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const username = (d.username || "").trim();
    if (!username) return { ok: false, error: "Missing username." };

    log('Récupération des données...');
    const res = await utils.twitterRequest(opts, `/users/by/username/${encodeURIComponent(username)}`, {
      query: { "user.fields": "id,name,username,description,profile_image_url,public_metrics,created_at,verified" }
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
      createdAt: r.created_at,
      verified: r.verified
    };
  }
};
