const { utils } = require("./utils");

module.exports = {
  async figma_project_files_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = String(d.projectId || "").trim();
    if (!projectId) return { ok: false, error: "projectId requis." };
    const path = `/projects/${encodeURIComponent(projectId)}/files`;
    const res = await utils.figmaRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawItems = Array.isArray(res.data?.files) ? res.data.files : [];
    const items = rawItems.map((r) => ({ id: String(r.key || r.id || ""), name: r.name || "", status: "file", url: r.thumbnail_url || "", result_json: utils.compactJson(r) }));
    return { ok: true, items, totalCount: items.length, nextCursor: "" };
  }
};
