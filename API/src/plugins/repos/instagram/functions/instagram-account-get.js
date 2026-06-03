const { utils } = require("./utils");

module.exports = {
  async instagram_account_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const igUserId = String(d.igUserId || "").trim();
    if (!igUserId) return { ok: false, error: "ID du compte Instagram requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(igUserId)}`, {
      query: { fields: "id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url" }
    });
    if (!res.ok) return res;
    const r = res.data || {};
    return {
      ok: true,
      id: r.id || "",
      username: r.username || "",
      name: r.name || "",
      biography: r.biography || "",
      website: r.website || "",
      followersCount: r.followers_count || 0,
      followsCount: r.follows_count || 0,
      mediaCount: r.media_count || 0,
      profilePictureUrl: r.profile_picture_url || ""
    };
  }
};
