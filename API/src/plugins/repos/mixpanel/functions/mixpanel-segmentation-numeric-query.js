const { utils } = require("./utils");

module.exports = {
  async mixpanel_segmentation_numeric_query(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    const event = String(d.event || "").trim();
    const fromDate = String(d.fromDate || "").trim();
    const toDate = String(d.toDate || "").trim();
    const expression = String(d.expression || "").trim();
    if (!projectId || !event || !fromDate || !toDate || !expression) return { ok: false, error: "projectId, event, fromDate, toDate et expression sont requis." };

    const res = await utils.mixpanelQueryRequest(opts, "/api/query/segmentation/numeric", {
      query: { project_id: projectId, event, from_date: fromDate, to_date: toDate, expression, unit: d.unit || "day", where: d.where || undefined }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Rapport segmentation numeric récupéré.", event, project_id: projectId, raw: res.data };
  }
};
