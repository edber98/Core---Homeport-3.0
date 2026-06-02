const { utils } = require("./utils");

module.exports = {
  async github_release_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const release_id = (d.release_id || "").toString().trim();
    if (!owner || !repo || !release_id) return { ok: false, error: "owner, repo et release_id requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/releases/${release_id}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, message: "Release supprimée.", status: "deleted" };
  }
};
