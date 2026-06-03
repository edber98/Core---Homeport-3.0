const { utils } = require("./utils");

module.exports = {
  async posthog_cohort_remove_person(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const cohortId = String(d.cohortId || "").trim();
    const personId = String(d.personId || "").trim();
    if (!cohortId) return { ok: false, error: "cohortId requis." };
    if (!personId) return { ok: false, error: "personId requis." };

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/cohorts/${encodeURIComponent(cohortId)}/remove_person_from_static_cohort/`, {
      method: "PATCH",
      body: { person_id: personId }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, id: cohortId, person_id: personId, raw: res.data };
  }
};
