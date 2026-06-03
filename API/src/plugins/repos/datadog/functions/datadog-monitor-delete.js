const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const monitorId = String((inputs || {}).monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };
    log("Suppression du monitor...");
    const res = await utils.datadogRequest(opts, `/api/v1/monitor/${encodeURIComponent(monitorId)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, id: res.data?.deleted_monitor_id || res.data?.id || monitorId, raw: res.data };
  }
};
