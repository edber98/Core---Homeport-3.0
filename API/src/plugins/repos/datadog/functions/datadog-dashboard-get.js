const { utils } = require("./utils");

module.exports = {
  async datadog_dashboard_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const dashboardId = String((inputs || {}).dashboardId || "").trim();
    if (!dashboardId) return { ok: false, error: "ID du dashboard requis." };
    log("Récupération du dashboard...");
    const res = await utils.datadogRequest(opts, `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`);
    if (!res.ok) return res;
    return { ok: true, ...utils.dashboardSummary(res.data || {}), raw: res.data };
  }
};
