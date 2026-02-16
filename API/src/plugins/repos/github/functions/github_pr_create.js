const { utils } = require("./utils");

module.exports = {
  async github_pr_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const title = (d.title || "").trim();
    const head = (d.head || "").trim();
    const base = (d.base || "").trim();
    if (!owner || !repo || !title || !head || !base) return { ok: false, error: "owner, repo, title, head et base requis." };
    const body = { title, head, base };
    if (d.body) body.body = d.body;
    if (d.draft !== undefined) body.draft = !!d.draft;
    log('Création en cours...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/pulls`, { method: "POST", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, number: r.number, title: r.title, body: r.body, state: r.state, html_url: r.html_url, head: r.head?.ref, base: r.base?.ref, user: r.user?.login, draft: r.draft, merged: r.merged, created_at: r.created_at };
  }
};
