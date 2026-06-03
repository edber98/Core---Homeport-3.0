const { utils } = require("./utils");

module.exports = {
  async asana_project_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectGid = (d.projectGid || "").trim();
    if (!projectGid) return { ok: false, error: "Missing projectGid." };

    const data = {};
    if (d.name) data.name = d.name;
    if (d.notes) data.notes = d.notes;
    if (d.color) data.color = d.color;
    if (Object.keys(data).length === 0) return { ok: false, error: "No fields to update." };

    const res = await utils.asanaRequest(opts, `/projects/${encodeURIComponent(projectGid)}`, {
      method: "PUT",
      body: { data }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return {
      ok: true,
      gid: r.gid || "",
      name: r.name || "",
      notes: r.notes || "",
      color: r.color || "",
      workspace: r.workspace ? (r.workspace.name || r.workspace.gid || "") : "",
      created_at: r.created_at || ""
    };
  }
};
