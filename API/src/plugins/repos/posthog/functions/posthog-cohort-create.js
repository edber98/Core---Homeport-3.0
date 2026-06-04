const { utils } = require("./utils");

module.exports = {
  async posthog_cohort_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    let payload = {};
    try { payload = utils.bodyFromFields(d, ["name", "description", "groups", "is_static", "deleted"], ["groups"]); }
    catch (e) { return { ok: false, error: e.message }; }

    if (!payload.name) return { ok: false, error: "payload.name requis pour creer un cohort." };

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/cohorts/`, {
      method: "POST",
      body: payload
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapCohort(res.data) };
  }
};
