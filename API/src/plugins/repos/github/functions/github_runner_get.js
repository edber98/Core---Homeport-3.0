const { utils } = require("./utils");

function mapRunner(r) {
  return {
    id: r.id,
    name: r.name,
    os: r.os,
    status: r.status,
    busy: r.busy,
    ephemeral: r.ephemeral,
    version: r.version,
    labels: (r.labels || []).map(l => l.name).join(", ")
  };
}

module.exports = {
  async github_runner_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const runner_id = (d.runner_id || "").toString().trim();
    if (!owner || !repo || !runner_id) return { ok: false, error: "owner, repo et runner_id requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/runners/${runner_id}`);
    if (!res.ok) return res;
    return { ok: true, ...mapRunner(res.data || {}) };
  }
};
