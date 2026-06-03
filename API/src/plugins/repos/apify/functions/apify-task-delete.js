const { utils } = require("./utils");

module.exports = {
  async apify_task_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.taskId) return { ok: false, error: "taskId requis." };
    const path = `/actor-tasks/${encodeURIComponent(String(d.taskId))}`;
    const res = await utils.apifyRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: String(d.taskId), status: "deleted", name: "", url: "", text: "Task supprimée.", result_json: utils.compactJson(res.data) };
  }
};
