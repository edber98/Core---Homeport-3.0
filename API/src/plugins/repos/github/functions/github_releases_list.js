const { utils } = require("./utils");

module.exports = {
  async github_releases_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    log('Récupération de la liste...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/releases`, { query: { per_page: d.per_page } });
    if (!res.ok) return res;
    const releases = (Array.isArray(res.data) ? res.data : []).map(r => ({ id: r.id, tag_name: r.tag_name, name: r.name, draft: r.draft, prerelease: r.prerelease, html_url: r.html_url, created_at: r.created_at, published_at: r.published_at }));
    return { ok: true, releases, totalCount: releases.length };
  }
};
