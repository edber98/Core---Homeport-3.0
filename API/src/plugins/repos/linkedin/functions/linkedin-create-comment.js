const { utils } = require("./utils");

module.exports = {
  async linkedin_create_comment(node, msg, inputs, opts) {
    const d = inputs || {};
    const postUrn = (d.postUrn || "").trim();
    if (!postUrn) return { ok: false, error: "Missing postUrn." };
    const actorUrn = (d.actorUrn || "").trim();
    if (!actorUrn) return { ok: false, error: "Missing actorUrn." };
    const text = (d.text || "").trim();
    if (!text) return { ok: false, error: "Missing text." };

    const res = await utils.linkedinRequest(opts, "/socialActions/" + encodeURIComponent(postUrn) + "/comments", {
      method: "POST",
      body: {
        actor: actorUrn,
        message: { text }
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r["$URN"] || r.id, text, postUrn, actorUrn };
  }
};
