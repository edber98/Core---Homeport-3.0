const { utils } = require("./utils");

module.exports = {
  async github_repo_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, message: "Dépôt supprimé.", status: "deleted" };
  }
};
