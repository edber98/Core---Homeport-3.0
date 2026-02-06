const { utils } = require("./utils");

module.exports = {
  async asana_project_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectGid = (d.projectGid || "").trim();
    if (!projectGid) return { ok: false, error: "Missing projectGid." };

    const res = await utils.asanaRequest(opts, `/projects/${encodeURIComponent(projectGid)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return {
      ok: true, gid: r.gid || "", name: r.name || "", notes: r.notes || "",
      color: r.color || "", workspace: r.workspace ? r.workspace.name : "",
      created_at: r.created_at || ""
    };
  }
};
