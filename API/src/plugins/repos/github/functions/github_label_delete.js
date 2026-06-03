const { utils } = require("./utils");

module.exports = {
  async github_label_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const name = (d.name || "").trim();
    if (!owner || !repo || !name) return { ok: false, error: "owner, repo et name requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, message: "Label supprimé.", status: "deleted" };
  }
};
