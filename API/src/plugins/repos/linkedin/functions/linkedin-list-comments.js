const { utils } = require("./utils");

module.exports = {
  async linkedin_list_comments(node, msg, inputs, opts) {
    const d = inputs || {};
    const postUrn = (d.postUrn || "").trim();
    if (!postUrn) return { ok: false, error: "Missing postUrn." };

    const res = await utils.linkedinRequest(opts, "/socialActions/" + encodeURIComponent(postUrn) + "/comments");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const comments = (r.elements || []).map(c => ({
      id: c["$URN"] || c.id,
      text: c.message?.text || "",
      actor: c.actor,
      createdAt: c.created?.time
    }));
    return { ok: true, comments };
  }
};
