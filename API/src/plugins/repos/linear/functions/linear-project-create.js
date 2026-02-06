const { utils } = require("./utils");

module.exports = {
  async linear_project_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const name = (d.name || "").trim();
    const teamIds = (d.teamIds || "").split(",").map(s => s.trim()).filter(Boolean);
    if (!name) return { ok: false, error: "Missing name." };
    if (teamIds.length === 0) return { ok: false, error: "Missing teamIds." };

    const input = { name, teamIds };
    if (d.description) input.description = d.description;

    const query = `mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project { id name description state progress url createdAt }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { input });
    if (!res.ok) return { ok: false, error: res.error };

    const pc = (res.data && res.data.projectCreate) || {};
    if (!pc.success) return { ok: false, error: "Project creation failed." };
    const p = pc.project || {};
    return {
      ok: true, id: p.id || "", name: p.name || "", description: p.description || "",
      state: p.state || "", progress: String(p.progress || 0), url: p.url || "",
      createdAt: p.createdAt || ""
    };
  }
};
