const { utils } = require("./utils");

module.exports = {
  async linkedin_get_post(node, msg, inputs, opts) {
    const postUrn = (inputs?.postUrn || "").trim();
    if (!postUrn) return { ok: false, error: "Missing postUrn." };

    const res = await utils.linkedinRequest(opts, `/posts/${encodeURIComponent(postUrn)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const p = res.data || {};
    return { ok: true, id: p.id || postUrn, text: p.commentary || p.text || "", authorUrn: p.author || "", visibility: p.visibility || "" };
  }
};
