const { utils } = require("./utils");

module.exports = {
  async asana_task_remove_project(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    const projectGid = (d.projectGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };
    if (!projectGid) return { ok: false, error: "Missing projectGid." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/removeProject`, {
      method: "POST",
      body: { data: { project: projectGid } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: `Projet ${projectGid} retire de la tache ${taskGid}.` };
  }
};
