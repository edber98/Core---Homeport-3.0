const { utils } = require("./utils");

module.exports = {
  async github_workflow_run_cancel(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const run_id = (d.run_id || "").toString().trim();
    if (!owner || !repo || !run_id) return { ok: false, error: "owner, repo et run_id requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/runs/${run_id}/cancel`, { method: "POST" });
    if (!res.ok) return res;
    return { ok: true, message: "Workflow annulé.", status: "cancelled" };
  }
};
