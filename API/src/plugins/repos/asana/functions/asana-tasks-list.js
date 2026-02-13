const { utils } = require("./utils");

module.exports = {
  async asana_tasks_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const projectGid = (d.projectGid || "").trim();
    if (!projectGid) return { ok: false, error: "Missing projectGid." };

    const limit = parseInt(d.limit, 10) || 100;
    log('Récupération de la liste...');
    const res = await utils.asanaRequest(opts, `/tasks`, {
      query: { project: projectGid, limit, opt_fields: "name,assignee.name,completed,due_on,created_at" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.data) || [];
    const tasks = results.map(r => ({
      gid: r.gid || "", name: r.name || "",
      assignee: r.assignee ? r.assignee.name : "",
      completed: String(r.completed || false), due_on: r.due_on || "",
      created_at: r.created_at || ""
    }));
    return { ok: true, tasks, totalCount: String(tasks.length) };
  }
};
