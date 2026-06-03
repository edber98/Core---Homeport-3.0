const { utils } = require("./utils");
module.exports = {
  async appsmith_git_metadata_app_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const baseArtifactId = String(d.baseArtifactId || "").trim();
    if (!baseArtifactId) return { ok: false, error: "Missing baseArtifactId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/git/metadata/app/${encodeURIComponent(String(d.baseArtifactId || "").trim())}`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
