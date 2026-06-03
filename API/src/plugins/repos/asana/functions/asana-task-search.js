const { utils } = require("./utils");

module.exports = {
  async asana_task_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const workspaceGid = String(d.workspaceGid || "").trim();
    if (!workspaceGid) return { ok: false, error: "Missing workspaceGid." };

    const query = {
      text: d.text,
      "projects.any": d.projectGid,
      "sections.any": d.sectionGid,
      "tags.any": d.tagGid,
      "assignee.any": d.assignee,
      completed: d.completed,
      limit: parseInt(d.limit, 10) || 50,
      opt_fields: "gid,name,notes,assignee.name,completed,due_on,projects.name,created_at,modified_at"
    };

    log("Recherche des tâches...");
    const res = await utils.asanaRequest(opts, `/workspaces/${encodeURIComponent(workspaceGid)}/tasks/search`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const tasks = ((res.data && res.data.data) || []).map((task) => utils.mapTask(task));
    return { ok: true, tasks, totalCount: String(tasks.length) };
  }
};
