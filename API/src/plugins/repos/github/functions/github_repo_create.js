const { utils } = require("./utils");

module.exports = {
  async github_repo_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "name requis." };
    const body = { name };
    if (d.description) body.description = d.description;
    if (d.private !== undefined) body.private = !!d.private;
    if (d.auto_init !== undefined) body.auto_init = !!d.auto_init;
    log('Création en cours...');
    const res = await utils.githubRequest(opts, "/user/repos", { method: "POST", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, name: r.name, full_name: r.full_name, description: r.description, private: r.private, html_url: r.html_url, default_branch: r.default_branch, created_at: r.created_at };
  }
};
