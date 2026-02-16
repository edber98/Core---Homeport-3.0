const { utils } = require("./utils");

module.exports = {
  async github_repo_fork(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const body = {};
    if (d.organization) body.organization = d.organization;
    log('Appel API en cours...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/forks`, { method: "POST", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, name: r.name, full_name: r.full_name, description: r.description, private: r.private, html_url: r.html_url, default_branch: r.default_branch, created_at: r.created_at };
  }
};
