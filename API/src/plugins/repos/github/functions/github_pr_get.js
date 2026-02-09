const { utils } = require("./utils");

module.exports = {
  async github_pr_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const pull_number = (d.pull_number || "").toString().trim();
    if (!owner || !repo || !pull_number) return { ok: false, error: "owner, repo et pull_number requis." };
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/pulls/${pull_number}`);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, number: r.number, title: r.title, body: r.body, state: r.state, html_url: r.html_url, head: r.head?.ref, base: r.base?.ref, user: r.user?.login, draft: r.draft, merged: r.merged, mergeable: r.mergeable, created_at: r.created_at };
  }
};
