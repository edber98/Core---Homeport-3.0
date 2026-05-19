const { utils } = require("./utils");

module.exports = {
  async instagram_media_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const mediaId = String(d.mediaId || "").trim();
    if (!mediaId) return { ok: false, error: "ID du média requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(mediaId)}`, {
      query: { fields: "id,caption,media_type,media_url,permalink,timestamp,username,comments_count,like_count" }
    });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapMedia(res.data) };
  }
};
