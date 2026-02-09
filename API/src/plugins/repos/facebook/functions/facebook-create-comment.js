const { utils } = require("./utils");

module.exports = {
  async facebook_create_comment(node, msg, inputs, opts) {
    const d = inputs || {};
    const postId = (d.postId || "").trim();
    if (!postId) return { ok: false, error: "Missing postId." };
    const message = (d.message || "").trim();
    if (!message) return { ok: false, error: "Missing message." };

    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: { message }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, message, postId };
  }
};
