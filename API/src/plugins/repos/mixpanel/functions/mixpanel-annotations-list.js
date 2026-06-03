const { utils } = require("./utils");

module.exports = {
  async mixpanel_annotations_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    if (!projectId) return { ok: false, error: "projectId requis." };

    const res = await utils.mixpanelQueryRequest(opts, "/api/2.0/annotations", {
      method: "GET",
      query: { project_id: projectId, from_date: d.fromDate || undefined, to_date: d.toDate || undefined }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    const items = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.annotations) ? res.data.annotations : []);
    return { ok: true, status: res.status, message: "Annotations recuperees.", event: "", distinct_id: "", raw: { totalCount: items.length, items, source: res.data } };
  }
};
