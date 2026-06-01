const { utils } = require("./utils");

module.exports = {
  async apify_task_input_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.taskId) return { ok: false, error: "taskId requis." };
    const path = `/actor-tasks/${encodeURIComponent(String(d.taskId))}/input`;
    const res = await utils.apifyRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: String(d.taskId), status: "", name: "task_input", url: "", text: "", result_json: utils.compactJson(res.data) };
  }
};
