const { utils } = require("./utils");

module.exports = {
  async linkedin_create_text_post(node, msg, inputs, opts) {
    const d = inputs || {};
    const authorUrn = (d.authorUrn || "").trim();
    if (!authorUrn) return { ok: false, error: "Missing authorUrn (ex.: urn:li:person:xxx)." };
    const text = (d.text || "").trim();
    if (!text) return { ok: false, error: "Missing text." };

    const visibility = d.visibility || "PUBLIC";

    const body = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE"
        }
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": visibility }
    };

    const res = await utils.linkedinRequest(opts, "/ugcPosts", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, text, authorUrn, visibility };
  }
};
