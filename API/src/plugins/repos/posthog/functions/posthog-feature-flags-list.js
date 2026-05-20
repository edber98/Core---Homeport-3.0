const { utils } = require("./utils");

module.exports = {
  async posthog_feature_flags_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};

    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const query = {
      limit: d.limit,
      offset: d.offset,
      search: d.search,
      active: d.active,
      type: d.type,
      evaluation_runtime: d.evaluationRuntime,
      tags: d.tags
    };

    log("Lecture des feature flags...");
    const res = await utils.posthogPrivateRequest(opts, `/api/projects/${encodeURIComponent(projectId)}/feature_flags/`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const raw = res.data || {};
    const list = Array.isArray(raw.results) ? raw.results : Array.isArray(raw) ? raw : [];
    return {
      ok: true,
      totalCount: Number(raw.count || list.length),
      next: raw.next || null,
      previous: raw.previous || null,
      flags: list.map(utils.mapFeatureFlag)
    };
  }
};
