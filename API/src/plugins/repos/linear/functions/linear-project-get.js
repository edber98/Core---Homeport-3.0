const { utils } = require("./utils");

module.exports = {
  async linear_project_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = (d.projectId || "").trim();
    if (!projectId) return { ok: false, error: "Missing projectId." };

    const query = `query Project($id: String!) {
      project(id: $id) { id name description state progress url createdAt }
    }`;

    const res = await utils.linearQuery(opts, query, { id: projectId });
    if (!res.ok) return { ok: false, error: res.error };

    const p = (res.data && res.data.project) || {};
    return {
      ok: true, id: p.id || "", name: p.name || "", description: p.description || "",
      state: p.state || "", progress: String(p.progress || 0), url: p.url || "",
      createdAt: p.createdAt || ""
    };
  }
};
