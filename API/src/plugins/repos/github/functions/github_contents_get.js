const { utils } = require("./utils");

module.exports = {
  async github_contents_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const path = (d.path || "").trim();
    if (!owner || !repo || !path) return { ok: false, error: "owner, repo et path requis." };
    const query = {};
    if (d.ref) query.ref = d.ref;
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, { query });
    if (!res.ok) return res;
    const r = res.data;
    if (Array.isArray(r)) {
      return { ok: true, type: "dir", entries: r.length };
    }
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
