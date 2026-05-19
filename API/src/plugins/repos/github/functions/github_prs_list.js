const { utils } = require("./utils");

module.exports = {
  async github_prs_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    log('Récupération de la liste...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/pulls`, { query: { state: d.state, head: d.head, base: d.base, sort: d.sort, per_page: d.per_page } });
    if (!res.ok) return res;
    const prs = (Array.isArray(res.data) ? res.data : []).map(r => ({ id: r.id, number: r.number, title: r.title, state: r.state, html_url: r.html_url, head: r.head?.ref, base: r.base?.ref, user: r.user?.login, draft: r.draft, created_at: r.created_at }));
    return { ok: true, prs, totalCount: prs.length };
  }
};
