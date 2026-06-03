const { utils } = require("./utils");

module.exports = {
  async github_runner_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const runner_id = (d.runner_id || "").toString().trim();
    if (!owner || !repo || !runner_id) return { ok: false, error: "owner, repo et runner_id requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/runners/${runner_id}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, message: "Runner supprimé.", status: "deleted" };
  }
};
