const { utils } = require("./utils");

module.exports = {
  async github_branch_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const branch = (d.branch || "").trim();
    if (!owner || !repo || !branch) return { ok: false, error: "owner, repo et branch requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, message: "Branche supprimée.", status: "deleted" };
  }
};
