const { utils } = require("./utils");

module.exports = {
  async posthog_cohort_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const cohortId = String(d.cohortId || "").trim();
    if (!cohortId) return { ok: false, error: "cohortId requis." };

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/cohorts/${encodeURIComponent(cohortId)}/`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, id: cohortId, deleted: true, raw: res.data };
  }
};
