const { utils } = require("./utils");

module.exports = {
  async posthog_feature_flag_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    let payload = {};
    try { payload = utils.bodyFromFields(d, ["key", "name", "active", "filters", "deleted", "rollout_percentage", "tags", "description"], ["filters", "tags"]); }
    catch (e) { return { ok: false, error: e.message }; }

    if (!payload.key && !payload.name) return { ok: false, error: "payload doit contenir au moins key ou name." };

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/feature_flags/`, { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapFeatureFlag(res.data) };
  }
};
