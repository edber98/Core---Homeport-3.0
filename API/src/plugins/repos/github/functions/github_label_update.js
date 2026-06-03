const { utils } = require("./utils");

module.exports = {
  async github_label_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const name = (d.name || "").trim();
    if (!owner || !repo || !name) return { ok: false, error: "owner, repo et name requis." };
    const body = {};
    if (d.new_name) body.new_name = d.new_name;
    if (d.color) body.color = d.color;
    if (d.description !== undefined) body.description = d.description;
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`, { method: "PATCH", body });
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, name: r.name, color: r.color, description: r.description };
  }
};
