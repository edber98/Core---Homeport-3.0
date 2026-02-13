const { utils } = require("./utils");

module.exports = {
  async github_label_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const name = (d.name || "").trim();
    if (!owner || !repo || !name) return { ok: false, error: "owner, repo et name requis." };
    const body = { name };
    if (d.color) body.color = d.color.replace(/^#/, "");
    if (d.description) body.description = d.description;
    log('Création en cours...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/labels`, { method: "POST", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, name: r.name, color: r.color, description: r.description };
  }
};
