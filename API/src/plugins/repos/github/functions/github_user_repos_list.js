const { utils } = require("./utils");

module.exports = {
  async github_user_repos_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const username = (d.username || "").trim();
    if (!username) return { ok: false, error: "username requis." };
    const res = await utils.githubRequest(opts, `/users/${username}/repos`, { query: { type: d.type, sort: d.sort, per_page: d.per_page } });
    if (!res.ok) return res;
    const repos = (res.data || []).map(r => ({ id: r.id, name: r.name, full_name: r.full_name, description: r.description, private: r.private, html_url: r.html_url, default_branch: r.default_branch, language: r.language, stargazers_count: r.stargazers_count, forks_count: r.forks_count }));
    return { ok: true, repos };
  }
};
