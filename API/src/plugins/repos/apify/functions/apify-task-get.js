const { utils } = require("./utils");

module.exports = {
  async apify_task_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.taskId) return { ok: false, error: "taskId requis." };
    const path = `/actor-tasks/${encodeURIComponent(String(d.taskId))}`;
    const res = await utils.apifyRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data?.data || res.data || {};
    return {
      ok: true,
      id: String(r.id || r.taskId || ""),
      status: r.status || "",
      name: r.name || "",
      url: r.actId ? `https://console.apify.com/actors/tasks/${r.id}` : "",
      text: r.description || "",
      result_json: utils.compactJson(res.data)
    };
  }
};
