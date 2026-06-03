const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_mute(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const monitorId = String(d.monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };
    const body = utils.compact({ scope: d.scope, end: utils.toNumber(d.end) });
    log("Mise en sourdine du monitor...");
    const res = await utils.datadogRequest(opts, `/api/v1/monitor/${encodeURIComponent(monitorId)}/mute`, { method: "POST", body });
    if (!res.ok) return res;
    return utils.monitorResult(res.data || {});
  }
};
