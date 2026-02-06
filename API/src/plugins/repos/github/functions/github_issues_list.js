const { utils } = require("./utils");

module.exports = {
  async github_issues_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/issues`, { query: { state: d.state, labels: d.labels, assignee: d.assignee, sort: d.sort, per_page: d.per_page } });
    if (!res.ok) return res;
    const issues = (res.data || []).map(r => ({ id: r.id, number: r.number, title: r.title, state: r.state, html_url: r.html_url, user: r.user?.login, labels: (r.labels || []).map(l => l.name).join(", "), assignees: (r.assignees || []).map(a => a.login).join(", "), created_at: r.created_at }));
    return { ok: true, issues };
  }
};
