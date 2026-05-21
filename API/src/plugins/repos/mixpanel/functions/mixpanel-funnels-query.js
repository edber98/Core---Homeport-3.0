const { utils } = require("./utils");

module.exports = {
  async mixpanel_funnels_query(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    const funnelId = String(d.funnelId || "").trim();
    const fromDate = String(d.fromDate || "").trim();
    const toDate = String(d.toDate || "").trim();
    if (!projectId || !funnelId || !fromDate || !toDate) return { ok: false, error: "projectId, funnelId, fromDate et toDate sont requis." };

    const query = {
      project_id: projectId,
      funnel_id: funnelId,
      from_date: fromDate,
      to_date: toDate,
      length: d.length || undefined,
      length_unit: d.lengthUnit || undefined,
      unit: d.unit || undefined,
      interval: d.interval || undefined,
      where: d.where || undefined,
      on: d.on || undefined,
      limit: d.limit || undefined
    };

    const res = await utils.mixpanelQueryRequest(opts, "/api/query/funnels", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    return { ok: true, status: res.status, message: "Rapport funnel récupéré.", project_id: projectId, raw: res.data };
  }
};
