const { utils } = require("./utils");

module.exports = {
  async clickup_task_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = (d.taskId || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    const res = await utils.clickupRequest(opts, `/task/${encodeURIComponent(taskId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Tâche ${taskId} supprimée.` };
  }
};
