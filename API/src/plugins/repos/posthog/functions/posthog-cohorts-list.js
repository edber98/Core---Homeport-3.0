const { utils } = require("./utils");

module.exports = {
  async posthog_cohorts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const query = { limit: d.limit, offset: d.offset };
    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/cohorts/`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const raw = res.data || {};
    const list = Array.isArray(raw.results) ? raw.results : Array.isArray(raw) ? raw : [];
    return {
      ok: true,
      totalCount: Number(raw.count || list.length),
      next: raw.next || null,
      previous: raw.previous || null,
      cohorts: list.map(utils.mapCohort)
    };
  }
};
