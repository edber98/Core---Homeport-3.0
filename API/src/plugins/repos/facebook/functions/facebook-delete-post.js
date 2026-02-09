const { utils } = require("./utils");

module.exports = {
  async facebook_delete_post(node, msg, inputs, opts) {
    const d = inputs || {};
    const postId = (d.postId || "").trim();
    if (!postId) return { ok: false, error: "Missing postId." };

    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(postId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, deleted: true, postId };
  }
};
