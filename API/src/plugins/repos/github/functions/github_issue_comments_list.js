const { utils } = require("./utils");

module.exports = {
  async github_issue_comments_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const issue_number = (d.issue_number || "").toString().trim();
    if (!owner || !repo || !issue_number) return { ok: false, error: "owner, repo et issue_number requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/issues/${issue_number}/comments`, { query: { per_page: d.per_page } });
    if (!res.ok) return res;
    const comments = (res.data || []).map(r => ({ id: r.id, body: r.body, user: r.user?.login, html_url: r.html_url, created_at: r.created_at }));
    return { ok: true, comments, totalCount: comments.length };
  }
};
