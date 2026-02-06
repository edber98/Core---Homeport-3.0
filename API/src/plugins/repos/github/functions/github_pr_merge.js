const { utils } = require("./utils");

module.exports = {
  async github_pr_merge(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const pull_number = (d.pull_number || "").toString().trim();
    if (!owner || !repo || !pull_number) return { ok: false, error: "owner, repo et pull_number requis." };
    const body = {};
    if (d.merge_method) body.merge_method = d.merge_method;
    if (d.commit_title) body.commit_title = d.commit_title;
    if (d.commit_message) body.commit_message = d.commit_message;
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/pulls/${pull_number}/merge`, { method: "PUT", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, merged: r.merged, message: r.message, sha: r.sha };
  }
};
