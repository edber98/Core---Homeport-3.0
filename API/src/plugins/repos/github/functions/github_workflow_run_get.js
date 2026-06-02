const { utils } = require("./utils");

module.exports = {
  async github_workflow_run_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const run_id = (d.run_id || "").toString().trim();
    if (!owner || !repo || !run_id) return { ok: false, error: "owner, repo et run_id requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/runs/${run_id}`);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, html_url: r.html_url, workflow_id: r.workflow_id, head_branch: r.head_branch, head_sha: r.head_sha, run_number: r.run_number, event: r.event, created_at: r.created_at, updated_at: r.updated_at };
  }
};
