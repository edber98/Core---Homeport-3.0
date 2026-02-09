const { utils } = require("./utils");

module.exports = {
  async asana_task_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Tâche ${taskGid} supprimée.` };
  }
};
