const { utils } = require("./utils");

module.exports = {
  async github_workflows_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    if (!owner || !repo) return { ok: false, error: "owner et repo requis." };
    log('Récupération de la liste...');
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/workflows`);
    if (!res.ok) return res;
    const workflows = (res.data?.workflows || []).map(r => ({ id: r.id, name: r.name, path: r.path, state: r.state, html_url: r.html_url, created_at: r.created_at }));
    return { ok: true, workflows, totalCount: workflows.length };
  }
};
