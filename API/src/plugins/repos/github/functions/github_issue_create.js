const { utils } = require("./utils");

module.exports = {
  async github_issue_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const title = (d.title || "").trim();
    if (!owner || !repo || !title) return { ok: false, error: "owner, repo et title requis." };
    const body = { title };
    if (d.body) body.body = d.body;
    if (d.labels) body.labels = d.labels.split(",").map(l => l.trim()).filter(Boolean);
    if (d.assignees) body.assignees = d.assignees.split(",").map(a => a.trim()).filter(Boolean);
    if (d.milestone) body.milestone = Number(d.milestone);
    log('Création en cours...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/issues`, { method: "POST", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, number: r.number, title: r.title, body: r.body, state: r.state, html_url: r.html_url, user: r.user?.login, labels: (r.labels || []).map(l => l.name).join(", "), assignees: (r.assignees || []).map(a => a.login).join(", "), created_at: r.created_at };
  }
};
