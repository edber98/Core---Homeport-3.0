const { utils } = require("./utils");

module.exports = {
  async asana_task_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    const data = {};
    if (d.name) data.name = d.name;
    if (d.notes) data.notes = d.notes;
    if (d.assignee) data.assignee = d.assignee;
    if (d.due_on) data.due_on = d.due_on;
    if (d.completed !== undefined && d.completed !== "") data.completed = d.completed === "true";

    if (Object.keys(data).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}`, {
      method: "PUT", body: { data }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return {
      ok: true, gid: r.gid || "", name: r.name || "", notes: r.notes || "",
      assignee: r.assignee ? r.assignee.name || r.assignee.gid : "",
      completed: String(r.completed || false), due_on: r.due_on || "",
      project: "", created_at: r.created_at || "", modified_at: r.modified_at || ""
    };
  }
};
