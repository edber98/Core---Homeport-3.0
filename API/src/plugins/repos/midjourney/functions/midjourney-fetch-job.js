const { utils } = require("./utils");

module.exports = {
  async midjourney_fetch_job(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = String(d.taskId || "").trim();
    if (!taskId) return { ok: false, error: "taskId requis." };

    const res = await utils.midjourneyRequest(opts, "/midjourney/v1/fetch", {
      method: "POST",
      body: { taskId }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const item = res.data?.data || {};
    const status = Number(item.status ?? 0);
    return {
      ok: true,
      status: Number(res.data?.status || 0),
      message: res.data?.message || "success",
      totalCount: 1,
      inProgressCount: status === 0 ? 1 : 0,
      completedCount: status === 1 ? 1 : 0,
      failedCount: status === 2 ? 1 : 0,
      jobs: [{
        taskId: String(item.taskId || taskId),
        status,
        statusLabel: utils.statusLabel(status),
        jobId: String(item.jobId || ""),
        image: String(item.image || ""),
        images: Array.isArray(item.images) ? item.images : [],
        prompt: String(item.prompt || ""),
        mjPrompt: String(item.mjPrompt || ""),
        failReason: String(item.failReason || ""),
        createdAt: utils.toIsoDateFromMs(item.createdAt),
        width: Number(item.width || 0),
        height: Number(item.height || 0),
        raw: item
      }],
      raw: res.data
    };
  }
};
