const { utils } = require("./utils");

module.exports = {
  async datadog_dashboards_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Liste des dashboards...");
    const res = await utils.datadogRequest(opts, "/api/v1/dashboard");
    if (!res.ok) return res;
    const raw = Array.isArray(res.data?.dashboards) ? res.data.dashboards : [];
    const dashboards = raw.map(utils.dashboardSummary);
    return { ok: true, totalCount: dashboards.length, dashboards, raw: res.data };
  }
};
