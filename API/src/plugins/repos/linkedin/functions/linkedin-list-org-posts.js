const { utils } = require("./utils");

module.exports = {
  async linkedin_list_org_posts(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const organizationUrn = (d.organizationUrn || "").trim();
    if (!organizationUrn) return { ok: false, error: "Missing organizationUrn (ex.: urn:li:organization:xxx)." };
    const count = parseInt(d.count, 10) || 10;

    log('Récupération de la liste...');
    const res = await utils.linkedinRequest(opts, "/ugcPosts", {
      query: { q: "authors", authors: `List(${organizationUrn})`, count }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const posts = (r.elements || []).map(p => ({
      id: p.id,
      author: p.author,
      text: p.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "",
      createdAt: p.created?.time,
      lifecycleState: p.lifecycleState
    }));
    return { ok: true, posts };
  }
};
