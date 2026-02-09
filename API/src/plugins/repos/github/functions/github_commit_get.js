const { utils } = require("./utils");

module.exports = {
  async github_commit_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const ref = (d.ref || "").trim();
    if (!owner || !repo || !ref) return { ok: false, error: "owner, repo et ref requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/commits/${ref}`);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, sha: r.sha, message: r.commit?.message, author: r.commit?.author?.name, date: r.commit?.author?.date, html_url: r.html_url, stats_additions: r.stats?.additions, stats_deletions: r.stats?.deletions, files_changed: r.files?.length };
  }
};
