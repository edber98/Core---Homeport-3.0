const { utils } = require("./utils");

module.exports = {
  async asana_projects_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const workspaceGid = (d.workspaceGid || "").trim();
    if (!workspaceGid) return { ok: false, error: "Missing workspaceGid." };

    const limit = parseInt(d.limit, 10) || 100;
    const res = await utils.asanaRequest(opts, "/projects", {
      query: { workspace: workspaceGid, limit, opt_fields: "name,color,workspace.name" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.data) || [];
    const projects = results.map(r => ({
      gid: r.gid || "", name: r.name || "", color: r.color || "",
      workspace: r.workspace ? r.workspace.name : ""
    }));
    return { ok: true, projects, totalCount: String(projects.length) };
  }
};
