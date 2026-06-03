const { utils } = require("./utils");

module.exports = {
  async asana_subtask_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const parentTaskGid = String(d.parentTaskGid || "").trim();
    const name = String(d.name || "").trim();
    if (!parentTaskGid) return { ok: false, error: "Missing parentTaskGid." };
    if (!name) return { ok: false, error: "Missing name." };

    const data = { name };
    if (d.notes) data.notes = d.notes;
    if (d.assignee) data.assignee = d.assignee;
    if (d.due_on) data.due_on = d.due_on;

    log("Création de la sous-tâche...");
    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(parentTaskGid)}/subtasks`, {
      method: "POST",
      body: { data }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapTask((res.data && res.data.data) || {}) };
  }
};
