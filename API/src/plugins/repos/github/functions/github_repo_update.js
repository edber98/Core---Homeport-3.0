const { utils } = require("./utils");

module.exports = {
  async github_repo_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.description !== undefined) body.description = d.description;
    if (d.private !== undefined) body.private = !!d.private;
    if (d.default_branch) body.default_branch = d.default_branch;
    log("Mise à jour en cours...");
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}`, { method: "PATCH", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, name: r.name, full_name: r.full_name, description: r.description, private: r.private, html_url: r.html_url, default_branch: r.default_branch, language: r.language, stargazers_count: r.stargazers_count, forks_count: r.forks_count, open_issues_count: r.open_issues_count, created_at: r.created_at, updated_at: r.updated_at };
  }
};
