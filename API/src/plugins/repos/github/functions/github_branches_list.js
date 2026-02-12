const { utils } = require("./utils");

module.exports = {
  async github_branches_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/branches`, { query: { per_page: d.per_page } });
    if (!res.ok) return res;
    const branches = (res.data || []).map(r => ({ name: r.name, sha: r.commit?.sha, protected: r.protected }));
    return { ok: true, branches, totalCount: branches.length };
  }
};
