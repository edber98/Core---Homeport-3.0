const { utils } = require("./utils");

module.exports = {
  async github_labels_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    log('Récupération de la liste...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/labels`);
    if (!res.ok) return res;
    const labels = (Array.isArray(res.data) ? res.data : []).map(r => ({ id: r.id, name: r.name, color: r.color, description: r.description }));
    return { ok: true, labels, totalCount: labels.length };
  }
};
