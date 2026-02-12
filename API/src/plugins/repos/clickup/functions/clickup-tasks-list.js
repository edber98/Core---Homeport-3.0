const { utils } = require("./utils");

module.exports = {
  async clickup_tasks_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const listId = (d.listId || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };

    const res = await utils.clickupRequest(opts, `/list/${encodeURIComponent(listId)}/task`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.tasks) || [];
    const tasks = results.map(r => ({
      id: r.id || "", name: r.name || "",
      status: r.status ? r.status.status : "",
      priority: r.priority ? r.priority.priority : "",
      assignees: (r.assignees || []).map(a => a.username || a.id).join(", "),
      due_date: r.due_date || "", date_created: r.date_created || ""
    }));
    return { ok: true, tasks, totalCount: tasks.length };
  }
};
