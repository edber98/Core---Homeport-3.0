const { utils } = require("./utils");

module.exports = {
  async linkedin_list_reactions(node, msg, inputs, opts) {
    const d = inputs || {};
    const postUrn = (d.postUrn || "").trim();
    if (!postUrn) return { ok: false, error: "Missing postUrn." };

    const res = await utils.linkedinRequest(opts, "/socialActions/" + encodeURIComponent(postUrn) + "/likes");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const reactions = (r.elements || []).map(l => ({
      actor: l.actor,
      createdAt: l.created?.time
    }));
    return { ok: true, reactions, total: reactions.length };
  }
};
