const { utils } = require("./utils");

module.exports = {
  async twitter_list_followers(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = (d.userId || "").trim();
    if (!userId) return { ok: false, error: "Missing userId." };
    const maxResults = parseInt(d.maxResults, 10) || 100;

    const res = await utils.twitterRequest(opts, `/users/${encodeURIComponent(userId)}/followers`, {
      query: {
        max_results: maxResults,
        "user.fields": "id,name,username,description,public_metrics"
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const users = (r.data || []).map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      description: u.description,
      followers: u.public_metrics?.followers_count
    }));
    return { ok: true, users, totalCount: r.meta?.result_count || users.length, nextToken: r.meta?.next_token || "" };
  }
};
