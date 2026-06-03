const { utils } = require("./utils");

module.exports = {
  async mixpanel_events_export(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    const fromDate = String(d.fromDate || "").trim();
    const toDate = String(d.toDate || "").trim();
    if (!projectId) return { ok: false, error: "projectId requis." };
    if (!fromDate) return { ok: false, error: "fromDate requis." };
    if (!toDate) return { ok: false, error: "toDate requis." };

    const query = {
      project_id: projectId,
      from_date: fromDate,
      to_date: toDate,
      event: d.event ? String(d.event) : undefined,
      where: d.where ? String(d.where) : undefined,
      limit: d.limit ? Number(d.limit) : undefined
    };

    const res = await utils.mixpanelQueryRequest(opts, "/api/2.0/export", { method: "GET", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    const rows = Array.isArray(res.data) ? res.data : [];
    return {
      ok: true,
      status: res.status,
      message: "Evenements exportes.",
      event: d.event ? String(d.event) : "",
      distinct_id: "",
      raw: { totalCount: rows.length, items: rows }
    };
  }
};
