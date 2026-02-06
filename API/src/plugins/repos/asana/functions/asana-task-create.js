const { utils } = require("./utils");

module.exports = {
  async asana_task_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectGid = (d.projectGid || "").trim();
    const name = (d.name || "").trim();
    if (!projectGid) return { ok: false, error: "Missing projectGid." };
    if (!name) return { ok: false, error: "Missing name." };

    const data = { name, projects: [projectGid] };
    if (d.notes) data.notes = d.notes;
    if (d.assignee) data.assignee = d.assignee;
    if (d.due_on) data.due_on = d.due_on;

    const res = await utils.asanaRequest(opts, "/tasks", { method: "POST", body: { data } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return {
      ok: true, gid: r.gid || "", name: r.name || "", notes: r.notes || "",
      assignee: r.assignee ? r.assignee.name || r.assignee.gid : "",
      completed: String(r.completed || false), due_on: r.due_on || "",
      project: projectGid, created_at: r.created_at || "", modified_at: r.modified_at || ""
    };
  }
};
