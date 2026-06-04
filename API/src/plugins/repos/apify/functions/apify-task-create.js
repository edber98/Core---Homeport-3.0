const { utils } = require("./utils");

module.exports = {
  async apify_task_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "name requis." };
    if (!d.actId) return { ok: false, error: "actId requis." };
    const body = { name: String(d.name) };
    body.actId = String(d.actId);

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

    const res = await utils.apifyRequest(opts, "/actor-tasks", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data?.data || res.data || {};
    return { ok: true, id: String(r.id || ""), status: r.status || "", name: r.name || "", url: "", text: r.description || "", result_json: utils.compactJson(res.data) };
  }
};
