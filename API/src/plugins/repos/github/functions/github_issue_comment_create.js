const { utils } = require("./utils");

module.exports = {
  async github_issue_comment_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const issue_number = (d.issue_number || "").toString().trim();
    const bodyText = (d.body || "").trim();
    if (!owner || !repo || !issue_number || !bodyText) return { ok: false, error: "owner, repo, issue_number et body requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/issues/${issue_number}/comments`, { method: "POST", body: { body: bodyText } });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, body: r.body, user: r.user?.login, html_url: r.html_url, created_at: r.created_at };
  }
};
