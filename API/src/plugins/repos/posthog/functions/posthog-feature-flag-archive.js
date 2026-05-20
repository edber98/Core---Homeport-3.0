const { utils } = require("./utils");

module.exports = {
  async posthog_feature_flag_archive(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const flagId = String(d.flagId || "").trim();
    if (!flagId) return { ok: false, error: "flagId requis." };

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/feature_flags/${encodeURIComponent(flagId)}/`, {
      method: "PATCH",
      body: { deleted: true }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapFeatureFlag(res.data), deleted: true };
  }
};
