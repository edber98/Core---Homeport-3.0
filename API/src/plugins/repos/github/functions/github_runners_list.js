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
  async github_runners_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/runners`, { query });
    if (!res.ok) return res;
    const r = res.data || {};
    const runners = (r.runners || []).map(mapRunner);
    return { ok: true, totalCount: r.total_count || runners.length, runners };
  }
};
