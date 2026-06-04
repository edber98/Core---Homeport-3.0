const { utils } = require("./utils");

module.exports = {
  async posthog_cohort_update(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const cohortId = String(d.cohortId || "").trim();
    if (!cohortId) return { ok: false, error: "cohortId requis." };

    let payload = {};
    try { payload = utils.bodyFromFields(d, ["name", "description", "groups", "is_static", "deleted"], ["groups"]); }
    catch (e) { return { ok: false, error: e.message }; }

    if (!Object.keys(payload).length) return { ok: false, error: "payload vide." };

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/cohorts/${encodeURIComponent(cohortId)}/`, {
      method: "PATCH",
      body: payload
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapCohort(res.data) };
  }
};
