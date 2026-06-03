const { utils } = require("./utils");

module.exports = {
  async github_release_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const release_id = (d.release_id || "").toString().trim();
    if (!owner || !repo || !release_id) return { ok: false, error: "owner, repo et release_id requis." };
    const body = {};
    if (d.tag_name) body.tag_name = d.tag_name;
    if (d.target_commitish) body.target_commitish = d.target_commitish;
    if (d.name !== undefined) body.name = d.name;
    if (d.body !== undefined) body.body = d.body;
    if (d.draft !== undefined) body.draft = !!d.draft;
    if (d.prerelease !== undefined) body.prerelease = !!d.prerelease;
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/releases/${release_id}`, { method: "PATCH", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, tag_name: r.tag_name, name: r.name, body: r.body, draft: r.draft, prerelease: r.prerelease, html_url: r.html_url, created_at: r.created_at, published_at: r.published_at };
  }
};
