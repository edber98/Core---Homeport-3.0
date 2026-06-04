const { utils } = require("./utils");

module.exports = {
  async posthog_cohort_add_persons(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const cohortId = String(d.cohortId || "").trim();
    if (!cohortId) return { ok: false, error: "cohortId requis." };

    let payload = {};
    try { payload = utils.bodyFromFields(d, ["person_ids", "person_id"], ["person_ids"]); }
    catch (e) { return { ok: false, error: e.message }; }

    if (!payload.person_ids && !payload.person_id) {
      return { ok: false, error: "payload doit contenir person_ids (array) ou person_id." };
    }

    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/cohorts/${encodeURIComponent(cohortId)}/add_persons_to_static_cohort/`, {
      method: "PATCH",
      body: payload
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, id: cohortId, raw: res.data };
  }
};
