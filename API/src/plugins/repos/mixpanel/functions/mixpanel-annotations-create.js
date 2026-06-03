const { utils } = require("./utils");

module.exports = {
  async mixpanel_annotations_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    const date = String(d.date || "").trim();
    const description = String(d.description || "").trim();
    if (!projectId) return { ok: false, error: "projectId requis." };
    if (!date) return { ok: false, error: "date requise." };
    if (!description) return { ok: false, error: "description requise." };

    const res = await utils.mixpanelQueryRequest(opts, "/api/2.0/annotations/create", {
      method: "POST",
      query: { project_id: projectId, date, description }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    return { ok: true, status: res.status, message: "Annotation creee.", event: "", distinct_id: "", raw: res.data };
  }
};
