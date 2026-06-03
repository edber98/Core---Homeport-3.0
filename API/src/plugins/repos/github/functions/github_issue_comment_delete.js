const { utils } = require("./utils");

module.exports = {
  async github_issue_comment_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const comment_id = (d.comment_id || "").toString().trim();
    if (!owner || !repo || !comment_id) return { ok: false, error: "owner, repo et comment_id requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/issues/comments/${comment_id}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, message: "Commentaire supprimé.", status: "deleted" };
  }
};
