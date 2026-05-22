const { utils } = require("./utils");

module.exports = {
  async midjourney_job_status(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    const taskIds = utils.parseTaskIdsInput(d.taskIds);
    if (!taskIds.length) {
      return { ok: false, error: "Au moins un task ID est requis." };
    }

    log("Récupération du statut des jobs Midjourney...");
    const res = await utils.midjourneyRequest(opts, "/midjourney/v1/job-status", {
      method: "POST",
      body: { taskIds }
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const jobsRaw = Array.isArray(payload.data) ? payload.data : [];

    const jobs = jobsRaw.map((item) => {
      const status = Number(item?.status);
      return {
        taskId: item?.taskId || "",
        status: Number.isFinite(status) ? status : -1,
        statusLabel: utils.statusLabel(status),
        jobId: item?.jobId || "",
        image: item?.image || "",
        images: Array.isArray(item?.images) ? item.images : [],
        prompt: item?.prompt || "",
        mjPrompt: item?.mjPrompt || "",
        failReason: item?.failReason || "",
        createdAt: utils.toIsoDateFromMs(item?.createdAt),
        width: Number(item?.meta?.width || 0),
        height: Number(item?.meta?.height || 0),
        raw: item || {}
      };
    });

    const inProgressCount = jobs.filter((job) => job.status === 0).length;
    const completedCount = jobs.filter((job) => job.status === 1).length;
    const failedCount = jobs.filter((job) => job.status === 2).length;

    return {
      ok: true,
      status: Number(payload.status || 0),
      message: payload.message || "success",
      totalCount: jobs.length,
      inProgressCount,
      completedCount,
      failedCount,
      jobs,
      raw: payload
    };
  }
};
