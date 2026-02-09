const { utils } = require("./utils");

module.exports = {
  async asana_task_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return {
      ok: true, gid: r.gid || "", name: r.name || "", notes: r.notes || "",
      assignee: r.assignee ? r.assignee.name || r.assignee.gid : "",
      completed: String(r.completed || false), due_on: r.due_on || "",
      project: (r.projects && r.projects[0]) ? r.projects[0].name : "",
      created_at: r.created_at || "", modified_at: r.modified_at || ""
    };
  }
};
