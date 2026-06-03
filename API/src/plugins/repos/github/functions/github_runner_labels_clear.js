const { utils } = require("./utils");

function mapLabels(data) {
  return (data.labels || []).map(l => ({ id: l.id, name: l.name, type: l.type }));
}

module.exports = {
  async github_runner_labels_clear(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const runner_id = (d.runner_id || "").toString().trim();
    if (!owner || !repo || !runner_id) return { ok: false, error: "owner, repo et runner_id requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/runners/${runner_id}/labels`, { method: "DELETE" });
    if (!res.ok) return res;
    const data = res.data || {};
    return { ok: true, totalCount: data.total_count || 0, labels: mapLabels(data) };
  }
};
