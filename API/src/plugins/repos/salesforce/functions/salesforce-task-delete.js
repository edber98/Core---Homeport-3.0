const { utils } = require("./utils");

module.exports = {
  async salesforce_task_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = (d.taskId || "").toString().trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    const res = await utils.sfRequest(opts, `/sobjects/Task/${encodeURIComponent(taskId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: taskId, deleted: true };
  }
};
