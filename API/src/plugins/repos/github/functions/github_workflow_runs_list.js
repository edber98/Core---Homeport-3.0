const { utils } = require("./utils");

module.exports = {
  async github_workflow_runs_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const query = {};
    if (d.branch) query.branch = d.branch;
    if (d.status) query.status = d.status;
    if (d.event) query.event = d.event;
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/runs`, { query });
    if (!res.ok) return res;
    const r = res.data;
    const runs = (r.workflow_runs || []).map(w => ({
      id: w.id,
      name: w.name,
      status: w.status,
      conclusion: w.conclusion,
      html_url: w.html_url,
      workflow_id: w.workflow_id,
      head_branch: w.head_branch,
      head_sha: w.head_sha,
      run_number: w.run_number,
      event: w.event,
      created_at: w.created_at,
      updated_at: w.updated_at
    }));
    return { ok: true, totalCount: r.total_count || runs.length, runs };
  }
};
