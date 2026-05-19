const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_unmute(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const monitorId = String(d.monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };
    const body = utils.compact({ scope: d.scope, all_scopes: utils.boolValue(d.allScopes) });
    log("Réactivation du monitor...");
    const res = await utils.datadogRequest(opts, `/api/v1/monitor/${encodeURIComponent(monitorId)}/unmute`, { method: "POST", body });
    if (!res.ok) return res;
    return utils.monitorResult(res.data || {});
  }
};
