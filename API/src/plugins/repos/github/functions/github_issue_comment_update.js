const { utils } = require("./utils");

module.exports = {
  async github_issue_comment_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const comment_id = (d.comment_id || "").toString().trim();
    const bodyText = (d.body || "").trim();
    if (!owner || !repo || !comment_id || !bodyText) return { ok: false, error: "owner, repo, comment_id et body requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/issues/comments/${comment_id}`, { method: "PATCH", body: { body: bodyText } });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, body: r.body, user: r.user?.login, html_url: r.html_url, created_at: r.created_at };
  }
};
