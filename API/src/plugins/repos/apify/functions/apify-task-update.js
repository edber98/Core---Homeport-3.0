const { utils } = require("./utils");

module.exports = {
  async apify_task_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.taskId) return { ok: false, error: "taskId requis." };
    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== "") body.name = String(d.name);
    if (d.actId !== undefined && d.actId !== null && d.actId !== "") body.actId = String(d.actId);

    const options = {};
    if (d.build !== undefined && d.build !== null && d.build !== "") options.build = String(d.build);
    if (d.timeoutSecs !== undefined && d.timeoutSecs !== null && d.timeoutSecs !== "") options.timeoutSecs = Number(d.timeoutSecs);
    if (d.memoryMbytes !== undefined && d.memoryMbytes !== null && d.memoryMbytes !== "") options.memoryMbytes = Number(d.memoryMbytes);
    if (d.maxItems !== undefined && d.maxItems !== null && d.maxItems !== "") options.maxItems = Number(d.maxItems);
    if (d.maxTotalChargeUsd !== undefined && d.maxTotalChargeUsd !== null && d.maxTotalChargeUsd !== "") options.maxTotalChargeUsd = Number(d.maxTotalChargeUsd);
    if (d.restartOnError !== undefined && d.restartOnError !== null && d.restartOnError !== "") options.restartOnError = Boolean(d.restartOnError);
    if (Object.keys(options).length) {
      body.options = options;
    }

    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ à mettre à jour." };
    const path = `/actor-tasks/${encodeURIComponent(String(d.taskId))}`;
    const res = await utils.apifyRequest(opts, path, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data?.data || res.data || {};
    return { ok: true, id: String(r.id || ""), status: r.status || "", name: r.name || "", url: "", text: r.description || "", result_json: utils.compactJson(res.data) };
  }
};
