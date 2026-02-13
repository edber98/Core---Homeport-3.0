const { utils } = require("./utils");

module.exports = {
  async linkedin_create_image_post(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const authorUrn = (d.authorUrn || "").trim();
    if (!authorUrn) return { ok: false, error: "Missing authorUrn." };
    const text = (d.text || "").trim();
    const imageUrl = (d.imageUrl || "").trim();
    if (!imageUrl) return { ok: false, error: "Missing imageUrl." };
    const title = (d.title || "").trim();
    const visibility = d.visibility || "PUBLIC";

    const body = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "IMAGE",
          media: [{
            status: "READY",
            originalUrl: imageUrl,
            title: { text: title || "Image" }
          }]
        }
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": visibility }
    };

    log('Création en cours...');
    const res = await utils.linkedinRequest(opts, "/ugcPosts", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, text, imageUrl, authorUrn };
  }
};
