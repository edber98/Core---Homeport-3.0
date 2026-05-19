const { utils } = require("./utils");

module.exports = {
  async postman_monitor_run(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const monitorId = String((inputs || {}).monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };
    log("Déclenchement du monitor...");
    const res = await utils.postmanRequest(opts, `/monitors/${encodeURIComponent(monitorId)}/run`, { method: "POST" });
    if (!res.ok) return res;
    return utils.operationResult(res.data || {});
  }
};
