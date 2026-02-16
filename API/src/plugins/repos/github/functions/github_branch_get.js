const { utils } = require("./utils");

module.exports = {
  async github_branch_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const branch = (d.branch || "").trim();
    if (!owner || !repo || !branch) return { ok: false, error: "owner, repo et branch requis." };
    log('Récupération des données...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/branches/${branch}`);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, name: r.name, sha: r.commit?.sha, protected: r.protected, commit_message: r.commit?.commit?.message, commit_author: r.commit?.commit?.author?.name };
  }
};
