const { utils } = require("./utils");

module.exports = {
  async linkedin_delete_post(node, msg, inputs, opts) {
    const d = inputs || {};
    const postUrn = (d.postUrn || "").trim();
    if (!postUrn) return { ok: false, error: "Missing postUrn." };

    const res = await utils.linkedinRequest(opts, `/ugcPosts/${encodeURIComponent(postUrn)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, deleted: true, postUrn };
  }
};
