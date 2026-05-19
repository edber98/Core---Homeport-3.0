const { utils } = require("./utils");

module.exports = {
  async instagram_media_container_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const igUserId = String(d.igUserId || "").trim();
    if (!igUserId) return { ok: false, error: "ID du compte Instagram requis." };

    const body = {};
    if (d.imageUrl) body.image_url = d.imageUrl;
    if (d.videoUrl) body.video_url = d.videoUrl;
    if (d.caption) body.caption = d.caption;
    if (d.mediaType) body.media_type = d.mediaType;
    if (!body.image_url && !body.video_url) return { ok: false, error: "URL image ou vidéo requise." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(igUserId)}/media`, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, id: res.data?.id || "", statusCode: "", status: "container_created" };
  }
};
