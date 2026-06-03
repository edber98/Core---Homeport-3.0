const { utils } = require("./utils");

module.exports = {
  async linear_project_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectId = (d.projectId || "").trim();
    if (!projectId) return { ok: false, error: "Missing projectId." };
    const input = {};
    if (d.name) input.name = d.name;
    if (d.description) input.description = d.description;
    if (Object.keys(input).length === 0) return { ok: false, error: "No fields to update." };

    const query = `mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success project { id name description state createdAt updatedAt url } } }`;
    const res = await utils.linearQuery(opts, query, { id: projectId, input });
    if (!res.ok) return { ok: false, error: res.error };
    const p = res.data?.projectUpdate?.project || {};
    return { ok: true, id: p.id || projectId, name: p.name || "", status: p.state || "", url: p.url || "", text: p.description || "" };
  }
};
