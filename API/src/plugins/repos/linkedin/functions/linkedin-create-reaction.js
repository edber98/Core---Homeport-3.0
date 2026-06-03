const { utils } = require("./utils");

module.exports = {
  async linkedin_create_reaction(node, msg, inputs, opts) {
    const d = inputs || {};
    const postUrn = (d.postUrn || "").trim();
    const actorUrn = (d.actorUrn || "").trim();
    const reactionType = (d.reactionType || "LIKE").trim();
    if (!postUrn) return { ok: false, error: "Missing postUrn." };
    if (!actorUrn) return { ok: false, error: "Missing actorUrn." };

    const res = await utils.linkedinRequest(opts, `/socialActions/${encodeURIComponent(postUrn)}/reactions`, {
      method: "POST",
      body: { actor: actorUrn, root: postUrn, reactionType }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, postUrn, actorUrn, reactionType, status: "created" };
  }
};
