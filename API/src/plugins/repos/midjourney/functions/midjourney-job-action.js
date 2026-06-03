const { utils } = require("./utils");

module.exports = {
  async midjourney_job_action(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = String(d.taskId || "").trim();
    const customId = String(d.customId || "").trim();
    if (!taskId) return { ok: false, error: "taskId requis." };
    if (!customId) return { ok: false, error: "customId requis." };

    const body = { taskId, customId };
    if (d.hookUrl) body.hookUrl = String(d.hookUrl).trim();

    const res = await utils.midjourneyRequest(opts, "/midjourney/v1/submit/action", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: Number(res.data?.status || 0),
      message: res.data?.message || "success",
      taskId: String(res.data?.data?.taskId || ""),
      raw: res.data
    };
  }
};
