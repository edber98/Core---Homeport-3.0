const { utils } = require("./utils");

module.exports = {
  async github_contents_upsert(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const path = (d.path || "").trim();
    const message = (d.message || "").trim();
    const content = d.content ?? "";
    if (!owner || !repo || !path || !message || content === "") return { ok: false, error: "owner, repo, path, message et content requis." };
    const body = { message };
    if (d.branch) body.branch = d.branch;
    if (d.sha) body.sha = d.sha;
    const encoding = (d.encoding || "text").trim().toLowerCase();
    body.content = encoding === "base64" ? String(content) : Buffer.from(String(content), "utf8").toString("base64");
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
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, { method: "PUT", body });
    if (!res.ok) return res;
    const r = res.data?.content || res.data;
    return {
      ok: true,
      name: r.name,
      path: r.path,
      sha: r.sha,
      size: r.size,
      encoding: r.encoding,
      content: r.content,
      html_url: r.html_url,
      download_url: r.download_url,
      type: r.type
    };
  }
};
