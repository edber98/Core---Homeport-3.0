const { utils } = require("./utils");

module.exports = {
  async datadog_dashboard_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const dashboardId = String(d.dashboardId || "").trim();
    if (!dashboardId) return { ok: false, error: "ID du dashboard requis." };

    let definition;
    try {
      definition = utils.parseJson(d.definition, "definition", {});
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const res = await utils.datadogRequest(opts, `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`, { method: "PUT", body: definition });
    if (!res.ok) return res;
    return { ok: true, ...utils.dashboardSummary(res.data || {}), raw: res.data };
  }
};
