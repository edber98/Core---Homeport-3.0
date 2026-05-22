const { utils } = require("./utils");

module.exports = {
  async mixpanel_profiles_query(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    if (!projectId) return { ok: false, error: "projectId requis." };

    const payload = {};
    if (d.distinctId) payload.distinct_id = String(d.distinctId);
    if (d.distinctIds) {
      try { payload.distinct_ids = utils.parseJsonInput(d.distinctIds, "distinctIds", { allowArray: true, allowObject: false }); }
      catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.where) payload.where = String(d.where);
    if (d.outputProperties) {
      try { payload.output_properties = utils.parseJsonInput(d.outputProperties, "outputProperties", { allowArray: true, allowObject: false }); }
      catch (e) { return { ok: false, error: e.message }; }
    }

    const query = { project_id: projectId, page: d.page || undefined, page_size: d.pageSize || undefined };
    const res = await utils.mixpanelQueryRequest(opts, "/api/query/engage", { method: "POST", query, body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    const raw = utils.asObject(res.data);
    const results = Array.isArray(raw.results) ? raw.results : [];

    return {
      ok: true,
      status: res.status,
      message: "Profils recuperes.",
      project_id: projectId,
      count: results.length,
      profiles: results,
      raw
    };
  }
};
