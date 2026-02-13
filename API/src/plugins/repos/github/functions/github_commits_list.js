const { utils } = require("./utils");

module.exports = {
  async github_commits_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    log('Récupération de la liste...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/commits`, { query: { sha: d.sha, path: d.path, since: d.since, until: d.until, per_page: d.per_page } });
    if (!res.ok) return res;
    const commits = (res.data || []).map(r => ({ sha: r.sha, message: r.commit?.message, author: r.commit?.author?.name, date: r.commit?.author?.date, html_url: r.html_url }));
    return { ok: true, commits, totalCount: commits.length };
  }
};
