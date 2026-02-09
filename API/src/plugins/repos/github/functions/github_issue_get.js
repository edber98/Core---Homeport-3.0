const { utils } = require("./utils");

module.exports = {
  async github_issue_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const issue_number = (d.issue_number || "").toString().trim();
    if (!owner || !repo || !issue_number) return { ok: false, error: "owner, repo et issue_number requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/issues/${issue_number}`);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, number: r.number, title: r.title, body: r.body, state: r.state, html_url: r.html_url, user: r.user?.login, labels: (r.labels || []).map(l => l.name).join(", "), assignees: (r.assignees || []).map(a => a.login).join(", "), created_at: r.created_at };
  }
};
