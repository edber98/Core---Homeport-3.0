const { utils } = require("./utils");

module.exports = {
  async asana_task_remove_dependencies(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    let dependencies = d.dependencies;
    if (typeof dependencies === "string") {
      try { dependencies = JSON.parse(dependencies); } catch { dependencies = dependencies.split(",").map(s => s.trim()).filter(Boolean); }
    }
    if (!Array.isArray(dependencies) || !dependencies.length) return { ok: false, error: "dependencies requis (JSON array ou CSV)." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/removeDependencies`, {
      method: "POST",
      body: { data: { dependencies } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: `Dependances retirees de la tache ${taskGid}.` };
  }
};
