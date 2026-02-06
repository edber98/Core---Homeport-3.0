const { utils } = require("./utils");

module.exports = {
  async twitter_get_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const listId = (d.listId || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };

    const res = await utils.twitterRequest(opts, `/lists/${encodeURIComponent(listId)}`, {
      query: { "list.fields": "id,name,description,owner_id,follower_count,member_count,created_at" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data?.data || {};
    return {
      ok: true,
      id: r.id,
      name: r.name,
      description: r.description,
      ownerId: r.owner_id,
      followerCount: r.follower_count,
      memberCount: r.member_count,
      createdAt: r.created_at
    };
  }
};
