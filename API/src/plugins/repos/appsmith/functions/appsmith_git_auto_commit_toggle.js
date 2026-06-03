const { utils } = require("./utils");
module.exports = {
  async appsmith_git_auto_commit_toggle(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const baseArtifactId = String(d.baseArtifactId || "").trim();
    if (!baseArtifactId) return { ok: false, error: "Missing baseArtifactId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/git/auto-commit/toggle/app/${encodeURIComponent(String(d.baseArtifactId || "").trim())}`, { method: 'PATCH', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: 'Opération terminée.', raw: res.data };
  }
};
