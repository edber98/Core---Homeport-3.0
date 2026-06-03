const { utils } = require("./utils");

module.exports = {
  async github_contents_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const path = (d.path || "").trim();
    const message = (d.message || "").trim();
    const sha = (d.sha || "").trim();
    if (!owner || !repo || !path || !message || !sha) return { ok: false, error: "owner, repo, path, message et sha requis." };
    const body = { message, sha };
    if (d.branch) body.branch = d.branch;
    if (d.committer_name || d.committer_email) {
      body.committer = {};
      if (d.committer_name) body.committer.name = d.committer_name;
      if (d.committer_email) body.committer.email = d.committer_email;
    }
    if (d.author_name || d.author_email) {
      body.author = {};
      if (d.author_name) body.author.name = d.author_name;
      if (d.author_email) body.author.email = d.author_email;
    }
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, { method: "DELETE", body });
    if (!res.ok) return res;
    return { ok: true, message: "Fichier supprimé.", status: "deleted" };
  }
};
