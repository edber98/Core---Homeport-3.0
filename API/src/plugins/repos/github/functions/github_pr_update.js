const { utils } = require("./utils");

module.exports = {
  async github_pr_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const pull_number = (d.pull_number || "").toString().trim();
    if (!owner || !repo || !pull_number) return { ok: false, error: "owner, repo et pull_number requis." };
    const body = {};
    if (d.title) body.title = d.title;
    if (d.body) body.body = d.body;
    if (d.state) body.state = d.state;
    if (d.base) body.base = d.base;
    log('Mise à jour en cours...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/pulls/${pull_number}`, { method: "PATCH", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, number: r.number, title: r.title, body: r.body, state: r.state, html_url: r.html_url, head: r.head?.ref, base: r.base?.ref, user: r.user?.login, draft: r.draft, merged: r.merged, created_at: r.created_at };
  }
};
