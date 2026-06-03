const { utils } = require("./utils");

module.exports = {
  async asana_subtasks_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskGid = String(d.taskGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    log("Récupération des sous-tâches...");
    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/subtasks`, {
      query: {
        limit: parseInt(d.limit, 10) || 50,
        offset: d.offset,
        opt_fields: "gid,name,notes,assignee.name,completed,due_on,created_at,modified_at"
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const tasks = ((res.data && res.data.data) || []).map((task) => utils.mapTask(task));
    return { ok: true, tasks, totalCount: String(tasks.length) };
  }
};
