const { utils } = require("./utils");

module.exports = {
  async clickup_task_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskId = (d.taskId || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    const body = {};
    if (d.name) body.name = d.name;
    if (d.description) body.description = d.description;
    if (d.priority) body.priority = parseInt(d.priority, 10);
    if (d.due_date) body.due_date = d.due_date;
    if (d.status) body.status = d.status;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.clickupRequest(opts, `/task/${encodeURIComponent(taskId)}`, {
      method: "PUT", body
    });
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
