const { utils } = require("./utils");

module.exports = {
  async github_branch_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const branch_name = (d.branch_name || "").trim();
    const sha = (d.sha || "").trim();
    if (!owner || !repo || !branch_name || !sha) return { ok: false, error: "owner, repo, branch_name et sha requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/git/refs`, { method: "POST", body: { ref: `refs/heads/${branch_name}`, sha } });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, name: branch_name, sha: r.object?.sha, ref: r.ref };
  }
};
