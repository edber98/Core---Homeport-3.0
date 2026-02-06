const { utils } = require("./utils");

module.exports = {
  async github_repo_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}`);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, name: r.name, full_name: r.full_name, description: r.description, private: r.private, html_url: r.html_url, default_branch: r.default_branch, language: r.language, stargazers_count: r.stargazers_count, forks_count: r.forks_count, open_issues_count: r.open_issues_count, created_at: r.created_at, updated_at: r.updated_at };
  }
};
