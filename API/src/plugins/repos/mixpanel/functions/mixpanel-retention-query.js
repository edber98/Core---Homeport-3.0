const { utils } = require("./utils");

module.exports = {
  async mixpanel_retention_query(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    const fromDate = String(d.fromDate || "").trim();
    const toDate = String(d.toDate || "").trim();
    if (!projectId || !fromDate || !toDate) return { ok: false, error: "projectId, fromDate et toDate sont requis." };

    const retentionType = String(d.retentionType || "birth");
    const query = {
      project_id: projectId,
      from_date: fromDate,
      to_date: toDate,
      retention_type: retentionType,
      born_event: d.bornEvent || undefined,
      event: d.event || undefined,
      interval: d.interval || undefined,
      unit: d.unit || undefined,
      where: d.where || undefined,
      on: d.on || undefined,
      limit: d.limit || undefined,
      unbounded_retention: d.unboundedRetention === undefined ? undefined : utils.parseBoolean(d.unboundedRetention, false)
    };

    const res = await utils.mixpanelQueryRequest(opts, "/api/query/retention", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    return { ok: true, status: res.status, message: "Rapport retention récupéré.", project_id: projectId, raw: res.data };
  }
};
