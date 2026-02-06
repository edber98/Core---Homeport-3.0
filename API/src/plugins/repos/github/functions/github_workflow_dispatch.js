const { utils } = require("./utils");

module.exports = {
  async github_workflow_dispatch(node, msg, inputs, opts) {
    const d = inputs || {};
    const owner = (d.owner || "").trim();
    const repo = (d.repo || "").trim();
    const workflow_id = (d.workflow_id || "").trim();
    const ref = (d.ref || "").trim();
    if (!owner || !repo || !workflow_id || !ref) return { ok: false, error: "owner, repo, workflow_id et ref requis." };
    const body = { ref };
    if (d.inputs) {
      try { body.inputs = JSON.parse(d.inputs); } catch (e) { return { ok: false, error: "inputs JSON invalide: " + e.message }; }
    }
    const res = await utils.githubRequest(opts, `/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, message: "Workflow déclenché avec succès.", status: "dispatched" };
  }
};
