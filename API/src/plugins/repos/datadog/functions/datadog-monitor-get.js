const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const monitorId = String((inputs || {}).monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };
    log("Récupération du monitor...");
    const res = await utils.datadogRequest(opts, `/api/v1/monitor/${encodeURIComponent(monitorId)}`);
    if (!res.ok) return res;
    return utils.monitorResult(res.data || {});
  }
};
