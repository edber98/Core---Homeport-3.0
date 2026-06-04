const { utils } = require("./utils");

module.exports = {
  async posthog_feature_flag_update(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const flagId = String(d.flagId || "").trim();
    if (!flagId) return { ok: false, error: "flagId requis." };

    let payload = {};
    try { payload = utils.bodyFromFields(d, ["key", "name", "active", "filters", "deleted", "rollout_percentage", "tags", "description"], ["filters", "tags"]); }
    catch (e) { return { ok: false, error: e.message }; }

    if (!Object.keys(payload).length) return { ok: false, error: "payload vide." };

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/feature_flags/${encodeURIComponent(flagId)}/`, { method: "PATCH", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapFeatureFlag(res.data) };
  }
};
