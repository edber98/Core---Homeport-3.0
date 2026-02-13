const { utils } = require("./utils");

module.exports = {
  async github_release_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const tag_name = (d.tag_name || "").trim();
    if (!owner || !repo || !tag_name) return { ok: false, error: "owner, repo et tag_name requis." };
    const body = { tag_name };
    if (d.name) body.name = d.name;
    if (d.body) body.body = d.body;
    if (d.draft !== undefined) body.draft = !!d.draft;
    if (d.prerelease !== undefined) body.prerelease = !!d.prerelease;
    if (d.target_commitish) body.target_commitish = d.target_commitish;
    log('Création en cours...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/releases`, { method: "POST", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, tag_name: r.tag_name, name: r.name, body: r.body, draft: r.draft, prerelease: r.prerelease, html_url: r.html_url, created_at: r.created_at, published_at: r.published_at };
  }
};
