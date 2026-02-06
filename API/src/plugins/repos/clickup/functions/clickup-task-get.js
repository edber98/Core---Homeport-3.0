const { utils } = require("./utils");

module.exports = {
  async clickup_task_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = (d.taskId || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    const res = await utils.clickupRequest(opts, `/task/${encodeURIComponent(taskId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true, id: r.id || "", name: r.name || "", description: r.description || "",
      status: r.status ? r.status.status : "", priority: r.priority ? r.priority.priority : "",
      assignees: (r.assignees || []).map(a => a.username || a.id).join(", "),
      due_date: r.due_date || "", listId: r.list ? r.list.id : "", url: r.url || "",
      date_created: r.date_created || ""
    };
  }
};
