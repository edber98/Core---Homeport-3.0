const { utils } = require("./utils");

module.exports = {
  async github_repo_forks_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    log('Récupération de la liste...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/forks`, { query: { per_page: d.per_page } });
    if (!res.ok) return res;
    const repos = (Array.isArray(res.data) ? res.data : []).map(r => ({ id: r.id, name: r.name, full_name: r.full_name, description: r.description, private: r.private, html_url: r.html_url, default_branch: r.default_branch, language: r.language, stargazers_count: r.stargazers_count, forks_count: r.forks_count }));
    return { ok: true, repos, totalCount: repos.length };
  }
};
