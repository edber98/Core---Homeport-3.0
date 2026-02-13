const { utils } = require("./utils");

module.exports = {
  async github_release_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const release_id = (d.release_id || "").toString().trim();
    if (!owner || !repo || !release_id) return { ok: false, error: "owner, repo et release_id requis." };
    log('Récupération des données...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/releases/${release_id}`);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, tag_name: r.tag_name, name: r.name, body: r.body, draft: r.draft, prerelease: r.prerelease, html_url: r.html_url, created_at: r.created_at, published_at: r.published_at };
  }
};
